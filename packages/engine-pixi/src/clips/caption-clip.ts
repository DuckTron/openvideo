import { type Application, Container, Graphics, SplitBitmapText } from "pixi.js";
import { redistributeCaptionWords, type ICaptionWord } from "@openvideo/core";
import type { IClip } from "./iclip";
import type {
  CaptionJSON,
  TextStyleJSON,
  CaptionDataJSON,
  CaptionPositioningJSON,
  ICaptionWordAnimation,
} from "../json-serialization";
import { isTransparent, parseColor, resolveColor } from "../utils/color";
import { BaseClip } from "./base-clip";
import { BaseTextClip, type IBaseTextOpts } from "./base-text-clip";
import type { BaseSpriteEvents } from "../sprite/base-sprite";

export type { ICaptionWord, ICaptionWordAnimation };

export interface ICaptionColors {
  appeared?: string;
  active?: string;
  activeFill?: string;
  background?: string;
  keyword?: string;
}

export interface ICaptionOpts extends IBaseTextOpts {
  words?: ICaptionWord[];
  active?: string;
  appeared?: string;
  activeFill?: string;
  keyword?: string;
  preserveKeywordColor?: boolean;
  wordAnimation?: ICaptionWordAnimation;
  wordsPerLine?: "single" | "multiple";
  mediaId?: string;
  videoWidth?: number;
  videoHeight?: number;
  bottomOffset?: number;
  caption?: {
    words?: ICaptionWord[];
    colors?: ICaptionColors;
    preserveKeywordColor?: boolean;
    wordAnimation?: ICaptionWordAnimation;
    positioning?: {
      videoWidth?: number;
      videoHeight?: number;
      bottomOffset?: number;
    };
  };
  initialLayoutApplied?: boolean;
}

export interface ICaptionEvents extends BaseSpriteEvents {
  propsChange: Partial<
    {
      left: number;
      top: number;
      width: number;
      height: number;
      angle: number;
      text: string;
      style: any;
    } & ICaptionOpts
  >;
}

interface CaptionSplitBitmapText extends SplitBitmapText {
  segmentIndex: number;
}

export class Caption extends BaseTextClip<ICaptionEvents> implements IClip {
  readonly type = "Caption";
  declare ready: IClip["ready"];

  private _lastTickTime = 0;
  protected _isWidthConstrained = false;

  private _words: ICaptionWord[] = [];

  declare public originalOpts: ICaptionOpts;

  // resolved opts shorthand (populated in _syncOpts)
  private _active = "";
  private _appeared = "";
  private _activeFill = "";
  private _keyword = "";
  private _preserveKeywordColor = false;
  private _wordAnimation: ICaptionWordAnimation = { type: "scale", application: "none", value: 1 };
  private _wordsPerLine: "single" | "multiple" = "multiple";
  protected _videoWidth = 1280;
  protected _videoHeight = 720;
  protected _bottomOffset = 100;

  // ─── text / textAlign (required by BaseTextClip) ─────────────────────────

  get text(): string {
    return this._text;
  }

  set text(v: string) {
    if (this._text === v) return;
    const prev = this._text;
    this._text = v;
    if (prev !== "" && this._words.length > 0) {
      this._words = redistributeCaptionWords(v, this._words, this.duration || 5e6);
    }
    if (this.originalOpts && this.textStyle) {
      this.refreshText().then(() => this.emit("propsChange", { text: v }));
    }
  }

  get textAlign(): "left" | "center" | "right" {
    return this.originalOpts?.align ?? "left";
  }

  // ─── Caption-specific properties ─────────────────────────────────────────

  get words(): ICaptionWord[] {
    return this._words;
  }

  set words(v: ICaptionWord[]) {
    this._words = v;
    if (this.originalOpts) this.originalOpts.words = v;
    this.refreshText().then(() => this.emit("propsChange", { style: this.style }));
  }

  get mediaId(): string | undefined {
    return this.originalOpts?.mediaId;
  }

  set mediaId(v: string | undefined) {
    if (this.originalOpts) this.originalOpts.mediaId = v;
  }

  get wordsPerLine(): "single" | "multiple" {
    return this._wordsPerLine;
  }

  set wordsPerLine(v: "single" | "multiple") {
    this._wordsPerLine = v;
    if (this.originalOpts) this.originalOpts.wordsPerLine = v;
    this.refreshText();
  }

  // ─── Style proxy ──────────────────────────────────────────────────────────

  override get style(): any {
    const opts = this.originalOpts ?? {};
    return {
      fontSize: opts.fontSize,
      fontFamily: opts.fontFamily,
      fontWeight: opts.fontWeight,
      fontStyle: opts.fontStyle,
      color: opts.color,
      align: opts.align,
      stroke: opts.stroke,
      shadow: opts.shadow,
      wordWrap: opts.wordWrap,
      wordWrapWidth: opts.wordWrapWidth,
      lineHeight: opts.lineHeight,
      letterSpacing: opts.letterSpacing,
      textCase: opts.textCase,
    };
  }

  override set style(opts: Partial<ICaptionOpts>) {
    this.updateStyle(opts);
  }

  async updateStyle(opts: Partial<ICaptionOpts>): Promise<void> {
    const processed = this._normalizeStyleOpts(opts) as Partial<ICaptionOpts>;
    this.originalOpts = { ...this.originalOpts, ...processed };
    if (processed.words !== undefined) this._words = processed.words;
    this._syncOpts();
    this._buildTextStyles();
    await this.refreshText();
    this.emit("propsChange", opts);
  }

  // ─── Width / height overrides ─────────────────────────────────────────────

  override get width(): number {
    return (this as any)._width;
  }

  override set width(v: number) {
    if (Math.abs(this.width - v) < 0.1) return;
    (this as any)._width = v;
    if (v > 0) this._isWidthConstrained = true;
    this.refreshText();
  }

  override get height(): number {
    return (this as any)._height;
  }

  override set height(v: number) {
    if (Math.abs(this.height - v) < 0.1) return;
    (this as any)._height = v;
    this.refreshText();
  }

  // ─── animate override ─────────────────────────────────────────────────────

  override animate(time: number): void {
    this._lastTickTime = time;
    super.animate(time);
  }

  // ─── Constructor ──────────────────────────────────────────────────────────

  constructor(text: string, opts: ICaptionOpts = {}, renderer?: Application["renderer"]) {
    super();
    this.originalOpts = { ...opts };
    this._text = text;
    if (renderer) this.setRenderer(renderer);

    // Flatten nested caption structure if provided
    if (opts.caption) {
      if (opts.caption.words) this._words = opts.caption.words;
      const c = opts.caption;
      if (c.colors?.appeared !== undefined) this.originalOpts.appeared = c.colors.appeared;
      if (c.colors?.active !== undefined) this.originalOpts.active = c.colors.active;
      if (c.colors?.activeFill !== undefined) this.originalOpts.activeFill = c.colors.activeFill;
      if (c.colors?.keyword !== undefined) this.originalOpts.keyword = c.colors.keyword;
      if (c.preserveKeywordColor !== undefined)
        this.originalOpts.preserveKeywordColor = c.preserveKeywordColor;
      if (c.wordAnimation !== undefined) this.originalOpts.wordAnimation = c.wordAnimation;
      if (c.positioning?.videoWidth !== undefined)
        this.originalOpts.videoWidth = c.positioning.videoWidth;
      if (c.positioning?.videoHeight !== undefined)
        this.originalOpts.videoHeight = c.positioning.videoHeight;
      if (c.positioning?.bottomOffset !== undefined)
        this.originalOpts.bottomOffset = c.positioning.bottomOffset;
    }
    if (opts.words) this._words = opts.words;
    void opts.initialLayoutApplied; // preserved in originalOpts for serialization consumers

    this._syncOpts();
    this._buildTextStyles();

    this.ready = (async () => {
      await this.refreshText();
      return { ...this.meta };
    })();
  }

  private _syncOpts(): void {
    const o = this.originalOpts ?? {};
    this._active = o.active ?? "";
    this._appeared = o.appeared ?? "";
    this._activeFill = o.activeFill ?? "";
    this._keyword = o.keyword ?? "";
    this._preserveKeywordColor = o.preserveKeywordColor ?? false;
    this._wordAnimation = o.wordAnimation ?? { type: "scale", application: "none", value: 1 };
    this._wordsPerLine = o.wordsPerLine ?? "multiple";
    this._videoWidth = o.videoWidth ?? 1280;
    this._videoHeight = o.videoHeight ?? 720;
    this._bottomOffset = o.bottomOffset ?? 100;
  }

  // ─── Rendering overrides ──────────────────────────────────────────────────

  protected override _buildWordObjects(textToRender: string): {
    textOnlyContainer: Container;
    words: string[];
  } {
    const textOnlyContainer = new Container();
    textOnlyContainer.label = "TextOnlyContainer";
    this.wordTexts.forEach((w) => w.destroy());
    this.wordTexts = [];

    const allWords: string[] = [];
    const textCase = this.originalOpts?.textCase;

    const makeWordText = (wordStr: string, segmentIndex: number): CaptionSplitBitmapText => {
      const wt = new SplitBitmapText({
        text: wordStr,
        style: this.textStyle,
      }) as unknown as CaptionSplitBitmapText;
      wt.segmentIndex = segmentIndex;
      const colorOpt = this.originalOpts?.color;
      const fillToParse =
        typeof colorOpt === "object" && colorOpt !== null && "type" in colorOpt
          ? 0xffffff
          : (colorOpt as string | number);
      const initialColor = parseColor(fillToParse);
      wt.tint = initialColor ?? 0xffffff;
      return wt;
    };

    if (this._words.length > 0) {
      this._words.forEach((segment, segmentIndex) => {
        let segText = segment.text || "";
        if (textCase === "uppercase") segText = segText.toUpperCase();
        else if (textCase === "lowercase") segText = segText.toLowerCase();
        else if (textCase === "title")
          segText = segText.replace(
            /\w\S*/g,
            (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase(),
          );

        const subWords = segText.split(/\s+/).filter((v) => v.length > 0);
        subWords.forEach((wordStr) => {
          const wt = makeWordText(wordStr, segmentIndex);
          textOnlyContainer.addChild(wt);
          this.wordTexts.push(wt as unknown as SplitBitmapText);
          allWords.push(wordStr);
        });
      });
    } else {
      textToRender
        .split(/\s+/)
        .filter((v) => v.length > 0)
        .forEach((wordStr, idx) => {
          const wt = makeWordText(wordStr, idx);
          textOnlyContainer.addChild(wt);
          this.wordTexts.push(wt as unknown as SplitBitmapText);
          allWords.push(wordStr);
        });
    }

    return { textOnlyContainer, words: allWords };
  }

  protected override _onAfterRefresh(): void {
    this.updateState(this._lastTickTime);
  }

  override async tick(time: number): Promise<{ video: ImageBitmap; state: "success" }> {
    this._lastTickTime = time;
    this.updateState(time);
    return super.tick(time);
  }

  // ─── updateState: core caption coloring logic ─────────────────────────────

  updateState(currentTimeUs: number): void {
    const currentTimeMs = currentTimeUs / 1000;

    (this.wordTexts as unknown as CaptionSplitBitmapText[]).forEach((wordText) => {
      const word = this._words[wordText.segmentIndex];
      if (!word) return;

      wordText.scale.set(1, 1);

      const isActive = currentTimeMs >= word.from && currentTimeMs < word.to;
      const hasBeenActive = currentTimeMs >= word.to;

      // ── Word animation ────────────────────────────────────────────────────
      const wa = this._wordAnimation;
      let animationFactor = 0;
      let shouldApply = false;

      if (wa && wa.application !== "none") {
        if (wa.application === "active" && isActive) shouldApply = true;
        else if (wa.application === "keyword" && word.isKeyWord) shouldApply = true;

        if (shouldApply) {
          if (wa.mode === "dynamic" && isActive) {
            const dur = word.to - word.from;
            if (dur > 0) {
              const progress = Math.max(0, Math.min(1, (currentTimeMs - word.from) / dur));
              animationFactor = wa.value < 1 ? progress : Math.sin(progress * Math.PI);
            } else {
              animationFactor = 1;
            }
          } else {
            animationFactor = 1;
          }

          if (wa.type === "scale") {
            const scale =
              wa.value < 1 && wa.mode === "dynamic" && isActive
                ? wa.value + (1 - wa.value) * animationFactor
                : 1 + (wa.value - 1) * animationFactor;
            wordText.scale.set(scale, scale);
          }
        }
      }

      // ── Colour resolution ─────────────────────────────────────────────────
      const isKeywordWithColor = word.isKeyWord && !isTransparent(this._keyword);
      let textColor = 0xffffff;
      let textAlpha = 1;

      if (word.isKeyWord && isActive && isKeywordWithColor) {
        ({ color: textColor, alpha: textAlpha } = resolveColor(this._keyword, 0xffff00));
      } else if (isActive) {
        ({ color: textColor, alpha: textAlpha } = resolveColor(this._active, 0xffffff));
      } else if (hasBeenActive && this._preserveKeywordColor && isKeywordWithColor) {
        ({ color: textColor, alpha: textAlpha } = resolveColor(this._keyword));
      } else if (hasBeenActive) {
        ({ color: textColor, alpha: textAlpha } = resolveColor(this._appeared));
      } else {
        const colorOpt = this.originalOpts?.color;
        const fill =
          typeof colorOpt === "object" && colorOpt !== null && "type" in colorOpt
            ? 0xffffff
            : (colorOpt as string | number);
        ({ color: textColor, alpha: textAlpha } = resolveColor(fill as any));
      }

      if (shouldApply && wa?.type === "opacity") {
        const opacityFactor =
          wa.value < 1 && wa.mode === "dynamic" && isActive
            ? wa.value + (1 - wa.value) * animationFactor
            : 1 + (wa.value - 1) * animationFactor;
        textAlpha *= opacityFactor;
      }

      // Apply colour to glyph children
      wordText.tint = 0xffffff;
      const applyColor = (obj: any) => {
        if (
          obj.label === "bgRect" ||
          obj.label === "tiktokBackground" ||
          obj.label === "containerBackground" ||
          (typeof obj.label === "string" && obj.label.startsWith("bgRect_"))
        )
          return;
        if ("tint" in obj) obj.tint = textColor;
        if ("alpha" in obj) obj.alpha = textAlpha;
        if (obj.children) obj.children.forEach(applyColor);
      };
      wordText.children.forEach(applyColor);

      // ── Active-word background pill ───────────────────────────────────────
      const parentContainer = wordText.parent as Container | null;
      const bgLabel = `bgRect_${wordText.segmentIndex}`;
      const existingBg = parentContainer
        ? (parentContainer.getChildByLabel(bgLabel) as Graphics | null)
        : null;

      const hasActiveBg =
        isActive &&
        !!this._activeFill &&
        !isTransparent(this._activeFill) &&
        this._activeFill !== "none";

      if (hasActiveBg && parentContainer) {
        const { color: bgColor, alpha: bgAlpha } = resolveColor(this._activeFill, 0xffa500);
        const padding = 15;
        const paddingX = 40;

        // Use word position directly as anchor.
        // localBounds.y is negative (glyph ascent sits above the origin baseline),
        // so we use the font size as the visual height and center the pill around
        // wordText.y (which _positionWords sets to the visual midline).
        const sx = wordText.scale.x;
        const visualW = (wordText.getLocalBounds().width || wordText.width) * sx;
        const visualH = (this.originalOpts?.fontSize ?? 40) * sx;
        const pillarX = wordText.x;
        // _positionWords applies a -9 baseline nudge; add it back so pill aligns to visual glyph top
        const pillarY = wordText.y + 9;

        const bg = existingBg ?? new Graphics();
        bg.label = bgLabel;
        bg.clear();
        bg.roundRect(
          pillarX - paddingX / 2,
          pillarY - padding / 2,
          visualW + paddingX,
          visualH + padding,
          10,
        );
        bg.fill({ color: bgColor, alpha: bgAlpha });
        bg.tint = 0xffffff;

        if (!existingBg) parentContainer.addChildAt(bg, 0);
      } else {
        if (existingBg && parentContainer) {
          parentContainer.removeChild(existingBg);
          existingBg.destroy();
        }
      }
    });
  }

  // ─── clone / toJSON / fromObject ──────────────────────────────────────────

  async clone(): Promise<this> {
    await this.ready;
    const newClip = new Caption(this.text, {
      ...this.originalOpts,
      words: [...this._words],
    }) as this;
    this.copyStateTo(newClip);
    newClip.id = this.id;
    newClip.effects = [...this.effects];
    return newClip;
  }

  toJSON(main: boolean = false): CaptionJSON {
    const base = super.toJSON(main);
    const opts = this.originalOpts ?? {};

    const style: TextStyleJSON = {};
    if (opts.fontSize !== undefined) style.fontSize = opts.fontSize;
    if (opts.fontFamily !== undefined) style.fontFamily = opts.fontFamily;
    if (opts.fontWeight !== undefined) style.fontWeight = opts.fontWeight as any;
    if (opts.fontStyle !== undefined) style.fontStyle = opts.fontStyle;
    if (opts.color !== undefined) style.color = opts.color as any;
    if (opts.align !== undefined) style.align = opts.align;
    if (opts.textCase !== undefined) style.textCase = opts.textCase;
    if (opts.fontUrl !== undefined) style.fontUrl = opts.fontUrl;
    if (opts.verticalAlign !== undefined) style.verticalAlign = opts.verticalAlign as any;
    if (opts.wordWrapWidth !== undefined) style.wordWrapWidth = opts.wordWrapWidth;
    if (opts.wordWrap !== undefined) style.wordWrap = opts.wordWrap;
    if (opts.wordAnimation !== undefined) style.wordAnimation = opts.wordAnimation;

    if (opts.stroke) {
      if (typeof opts.stroke === "object") {
        style.stroke = { color: opts.stroke.color, width: opts.stroke.width };
      } else {
        style.stroke = { color: opts.stroke, width: opts.strokeWidth ?? 0 };
      }
    }
    if (opts.shadow) {
      style.shadow = {
        color: (opts.shadow.color ?? "#000000") as string,
        alpha: opts.shadow.alpha ?? 0.5,
        blur: opts.shadow.blur ?? 4,
        offsetX: opts.shadow.offsetX ?? 0,
        offsetY: opts.shadow.offsetY ?? 0,
      };
    }

    const caption: CaptionDataJSON = {};
    if (this._words.length > 0) caption.words = this._words;

    const colors: Record<string, string> = {};
    if (opts.appeared) colors.appeared = opts.appeared;
    if (opts.active) colors.active = opts.active;
    if (opts.activeFill) colors.activeFill = opts.activeFill;
    if (opts.keyword) colors.keyword = opts.keyword;
    if (Object.keys(colors).length > 0) caption.colors = colors as any;

    if (opts.preserveKeywordColor !== undefined)
      caption.preserveKeywordColor = opts.preserveKeywordColor;
    if (opts.wordAnimation !== undefined) caption.wordAnimation = opts.wordAnimation;

    const positioning: CaptionPositioningJSON = {};
    if (opts.videoWidth !== undefined) positioning.videoWidth = opts.videoWidth;
    if (opts.videoHeight !== undefined) positioning.videoHeight = opts.videoHeight;
    if (opts.bottomOffset !== undefined) positioning.bottomOffset = opts.bottomOffset;
    if (Object.keys(positioning).length > 0) caption.positioning = positioning;

    return {
      ...base,
      type: "Caption",
      text: this.text,
      style,
      caption: Object.keys(caption).length > 0 ? caption : undefined,
      id: this.id,
      effects: this.effects,
      mediaId: this.mediaId,
      wordsPerLine: this.wordsPerLine,
      fontUrl: opts.fontUrl,
    } as CaptionJSON;
  }

  static async fromObject(json: CaptionJSON): Promise<Caption> {
    if (json.type !== "Caption") throw new Error(`Expected Caption, got ${json.type}`);

    const text = json.text || "";
    const style = json.style || {};
    const captionOpts: ICaptionOpts = {};

    if (style.fontSize !== undefined) captionOpts.fontSize = style.fontSize;
    if (style.fontFamily !== undefined) captionOpts.fontFamily = style.fontFamily;
    if (style.fontWeight !== undefined) captionOpts.fontWeight = style.fontWeight as any;
    if (style.fontStyle !== undefined) captionOpts.fontStyle = style.fontStyle as any;
    if (style.color !== undefined) captionOpts.color = style.color;
    else if ((style as any).fill !== undefined) captionOpts.color = (style as any).fill;
    if (style.align !== undefined) captionOpts.align = style.align;
    if (style.textCase !== undefined) captionOpts.textCase = style.textCase;
    if (style.verticalAlign !== undefined) captionOpts.verticalAlign = style.verticalAlign as any;
    if (style.wordWrapWidth !== undefined) captionOpts.wordWrapWidth = style.wordWrapWidth;
    if (style.wordWrap !== undefined) captionOpts.wordWrap = style.wordWrap;
    if (style.wordAnimation !== undefined) captionOpts.wordAnimation = style.wordAnimation;
    if (style.fontUrl !== undefined) captionOpts.fontUrl = style.fontUrl;
    else if (json.fontUrl !== undefined) captionOpts.fontUrl = json.fontUrl;
    if (style.wordsPerLine !== undefined) captionOpts.wordsPerLine = style.wordsPerLine;
    else if (json.wordsPerLine !== undefined) captionOpts.wordsPerLine = json.wordsPerLine;

    if (json.mediaId) captionOpts.mediaId = json.mediaId;

    if (style.stroke) {
      captionOpts.stroke = style.stroke.color;
      captionOpts.strokeWidth = style.stroke.width;
    }
    if (style.shadow) {
      captionOpts.shadow = {
        color: style.shadow.color,
        alpha: style.shadow.alpha,
        blur: style.shadow.blur,
        offsetX: style.shadow.offsetX ?? 0,
        offsetY: style.shadow.offsetY ?? 0,
      };
    }

    if (json.caption) {
      captionOpts.caption = json.caption;
      if (json.caption.wordAnimation) captionOpts.wordAnimation = json.caption.wordAnimation;
    }

    captionOpts.initialLayoutApplied = true;

    const clip = new Caption(text, captionOpts);
    BaseClip.deserializeBaseProperties(clip, json);
    clip.wordsPerLine = json.wordsPerLine ?? "multiple";
    if (json.effects) clip.effects = json.effects;
    await clip.ready;
    return clip;
  }

  override getVisibleHandles(): Array<
    "tl" | "tr" | "bl" | "br" | "ml" | "mr" | "mt" | "mb" | "rot"
  > {
    return ["mr", "mb", "br", "rot"];
  }
}
