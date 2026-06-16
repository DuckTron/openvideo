import { type Application, type Container, SplitBitmapText, Color } from "pixi.js";
import { BaseClip } from "./base-clip";
import type { IClip } from "./iclip";
import type { TextJSON, TextStyleJSON } from "../json-serialization";
import type { BaseSpriteEvents } from "../sprite/base-sprite";
import { BaseTextClip, type IBaseTextOpts } from "./base-text-clip";

export interface ITextOpts extends IBaseTextOpts {
  /**
   * Text decoration ('none', 'underline', 'line-through', 'overline')
   * @default 'none'
   */
  textDecoration?: "none" | "underline" | "line-through" | "overline";
  /**
   * Words per line mode ('single' or 'multiple')
   * @default 'multiple'
   */
  wordsPerLine?: "single" | "multiple";
}

export interface ITextEvents extends BaseSpriteEvents {
  propsChange: Partial<
    {
      left: number;
      top: number;
      width: number;
      height: number;
      angle: number;
      zIndex: number;
      opacity: number;
      volume: number;
      text: string;
      style: any;
    } & ITextOpts
  >;
}

/**
 * Text clip using PixiJS Text for rendering
 *
 * @example
 * const textClip = new Text('Hello World', {
 *   fontSize: 48,
 *   fill: '#ffffff',
 *   stroke: '#000000',
 *   strokeWidth: 2,
 *   dropShadow: {
 *     color: '#000000',
 *     alpha: 0.5,
 *     blur: 4,
 *     distance: 2,
 *   },
 * });
 * textClip.duration = 5e6; // 5 seconds
 */
export class Text extends BaseTextClip<ITextEvents> {
  readonly type = "Text";
  declare ready: IClip["ready"];

  // Override width/height to trigger refreshText when resized by transformer
  // Use getters from BaseSprite but override setters
  override get width(): number {
    return (this as any)._width;
  }

  override set width(v: number) {
    if (Math.abs(this.width - v) < 0.1) return;
    (this as any)._width = v;
    this._targetWidth = v;
    this.refreshText().then(() => {
      // When height is auto (not explicitly set), emit height change after text reflows
      if (!this._explicitHeight) {
        this.emit("propsChange", { width: v, height: this.height });
      } else {
        this.emit("propsChange", { width: v });
      }
    });
  }

  override get height(): number {
    return (this as any)._height;
  }

  /**
   * Flag to track if height was explicitly set by user (vs auto-calculated from content)
   */
  private _explicitHeight = false;

  /**
   * Get whether height was explicitly set by user
   */
  get isExplicitHeight(): boolean {
    return this._explicitHeight;
  }

  /**
   * Reset height to auto-fit mode (height will adjust to content)
   */
  resetHeightToAuto(): void {
    this._explicitHeight = false;
    (this as any)._height = 0;
    this.refreshText().then(() => {
      this.emit("propsChange", { height: this.height });
    });
  }

  override set height(v: number) {
    if (Math.abs(this.height - v) < 0.1) return;
    // Store the requested value temporarily
    const requestedHeight = v;
    (this as any)._height = v;
    this.refreshText().then(() => {
      // After refresh, determine if this should be treated as explicit height
      // contentHeight = the natural height text wants at current width
      const contentHeight = this.meta.height;
      // Only auto-mark as explicit if user is forcing a smaller height than content requires
      // (diff < -5px). Otherwise preserve existing explicit mode or stay in auto mode.
      // This prevents transformer resize from accidentally marking height as explicit
      // when text reflows due to width changes.
      const diff = requestedHeight - contentHeight;
      const isForcingSmaller = diff < -5;
      // Mark as explicit if: value > 0 AND (forcing smaller OR already explicit)
      this._explicitHeight = requestedHeight > 0 && (isForcingSmaller || this._explicitHeight);
      // Emit the actual calculated height (may differ from input v if content is taller)
      this.emit("propsChange", { height: this.height });
    });
  }

  /**
   * Text content (hybrid JSON structure)
   */
  get text(): string {
    return this._text;
  }

  set text(v: string) {
    if (this._text === v) return;
    this._text = v;
    // Only refresh if already initialized
    if (this.originalOpts && this.textStyle) {
      this.refreshText().then(() => {
        this.emit("propsChange", { text: v });
      });
    }
  }

  /**
   * Text styling (hybrid JSON structure)
   * Provides direct access to styling properties
   */
  /**
   * Text styling (hybrid JSON structure)
   * Provides direct access to styling properties
   */
  override get style(): any {
    return {
      fontSize: this.originalOpts.fontSize,
      fontFamily: this.originalOpts.fontFamily,
      fontWeight: this.originalOpts.fontWeight,
      fontStyle: this.originalOpts.fontStyle,
      color: this.originalOpts.color,
      align: this.originalOpts.align,
      stroke: this.originalOpts.stroke
        ? typeof this.originalOpts.stroke === "object"
          ? {
              color: this.originalOpts.stroke.color,
              width: this.originalOpts.stroke.width,
              join: this.originalOpts.stroke.join,
              cap: this.originalOpts.stroke.cap,
              miterLimit: this.originalOpts.stroke.miterLimit,
            }
          : {
              color: this.originalOpts.stroke,
              width: this.originalOpts.strokeWidth ?? 0,
            }
        : undefined,
      shadow: this.originalOpts.shadow
        ? {
            color: this.originalOpts.shadow.color ?? "#000000",
            alpha: this.originalOpts.shadow.alpha ?? 0.5,
            blur: this.originalOpts.shadow.blur ?? 4,
            offsetX: this.originalOpts.shadow.offsetX ?? 0,
            offsetY: this.originalOpts.shadow.offsetY ?? 0,
          }
        : undefined,
      wordWrap: this.originalOpts.wordWrap,
      wordWrapWidth: this.originalOpts.wordWrapWidth,
      lineHeight: this.originalOpts.lineHeight,
      letterSpacing: this.originalOpts.letterSpacing,
      textCase: this.originalOpts.textCase,
      textDecoration: this.originalOpts.textDecoration,
      background: this.originalOpts.background,
    };
  }

  override set style(opts: Partial<ITextOpts>) {
    this.updateStyle(opts);
  }

  /**
   * Text alignment proxy for compatibility with UI
   */
  get textAlign(): "left" | "center" | "right" {
    return this.originalOpts.align || (this.originalOpts as any).textAlign || "left";
  }

  set textAlign(v: "left" | "center" | "right") {
    this.updateStyle({ align: v });
  }

  /**
   * Vertical alignment or decoration proxy
   */
  get verticalAlign(): string {
    return (this.originalOpts as any).verticalAlign || this.originalOpts.textDecoration || "top";
  }

  set verticalAlign(v: string) {
    if (["underline", "overline", "strikethrough", "line-through"].includes(v)) {
      this.updateStyle({
        textDecoration: v === "strikethrough" ? "line-through" : (v as any),
      } as any);
      // Also store as verticalAlign for UI state persistence
      (this.originalOpts as any).verticalAlign = v;
    } else {
      this.updateStyle({ verticalAlign: v } as any);
    }
  }

  /**
   * Text case proxy
   */
  get textCase(): string {
    return this.originalOpts.textCase || "none";
  }

  set textCase(v: "none" | "uppercase" | "lowercase" | "title") {
    this.updateStyle({ textCase: v });
  }

  /**
   * Decoration proxies for UI compatibility (booleans)
   */
  get underline(): boolean {
    return this.originalOpts.textDecoration === "underline";
  }

  set underline(v: boolean) {
    this.updateStyle({ textDecoration: v ? "underline" : "none" });
  }

  get overline(): boolean {
    return this.originalOpts.textDecoration === "overline";
  }

  set overline(v: boolean) {
    this.updateStyle({ textDecoration: v ? "overline" : "none" });
  }

  get linethrough(): boolean {
    return this.originalOpts.textDecoration === "line-through";
  }

  set linethrough(v: boolean) {
    this.updateStyle({ textDecoration: v ? "line-through" : "none" });
  }

  // The resize target set by the width setter. Kept separate from _width (which
  // _doRefreshText overwrites with the measured containerWidth at the end of each run).
  protected _targetWidth = 0;

  // Cached measurements for fast real-time layout updates (fabric.js-style optimization)
  private _wordCache: Array<{
    text: string;
    width: number;
    height: number;
    textObj: SplitBitmapText | null;
  }> = [];
  private _measuredTextHeight = 0;
  private _lineHeightMultiplier = 1;
  private _fontSize = 40;
  private _textOnlyContainer: Container | null = null;

  declare public originalOpts: ITextOpts;

  constructor(text: string, opts: ITextOpts = {}, renderer?: Application["renderer"]) {
    super();
    this.originalOpts = { ...opts } as ITextOpts;
    this._text = text;
    if (renderer) this.setRenderer(renderer);
    this._buildTextStyles();
    this.ready = (async () => {
      await this.refreshText();
      return { ...this.meta };
    })();
  }

  override _onAfterRefresh(
    words: string[],
    textOnlyContainer: Container,
    spaceWidth: number,
    measuredTextHeight: number,
    lineHeightMultiplier: number,
    fontSize: number,
  ): void {
    this._populateWordCache(
      words,
      textOnlyContainer,
      spaceWidth,
      measuredTextHeight,
      lineHeightMultiplier,
      fontSize,
    );
  }

  async clone() {
    await this.ready;
    const style = this.textStyle;
    const originalOpts = this.originalOpts || {};

    const colorToNumber = (color: any): number | undefined => {
      if (color === undefined || color === null) return undefined;
      if (typeof color === "number") return color;
      if (color instanceof Color) return color.toNumber();
      return undefined;
    };

    const { stroke, strokeWidth } = this._cloneStrokeOpts(colorToNumber);

    const opts: ITextOpts = {
      fontSize: originalOpts.fontSize ?? style.fontSize,
      fontFamily:
        originalOpts.fontFamily ??
        (Array.isArray(style.fontFamily)
          ? style.fontFamily[0]
          : typeof style.fontFamily === "string"
            ? style.fontFamily
            : "Roboto"),
      fontWeight: originalOpts.fontWeight ?? style.fontWeight,
      fontStyle: originalOpts.fontStyle ?? style.fontStyle,
      align:
        originalOpts.align ??
        (style.align === "justify" ? "left" : (style.align as "left" | "center" | "right")),
      textCase: originalOpts.textCase,
      textDecoration: originalOpts.textDecoration,
      color: this._cloneColorOpts(colorToNumber),
      stroke,
      strokeWidth,
      shadow: this._cloneShadowOpts(colorToNumber),
    };

    if (originalOpts.wordWrap !== undefined) {
      opts.wordWrap = originalOpts.wordWrap;
      opts.wordWrapWidth = originalOpts.wordWrapWidth;
    } else if (style.wordWrap) {
      opts.wordWrap = style.wordWrap;
      opts.wordWrapWidth = style.wordWrapWidth;
    }

    if (originalOpts.background !== undefined) opts.background = originalOpts.background;

    if (originalOpts.lineHeight !== undefined) {
      opts.lineHeight = originalOpts.lineHeight;
    } else if (style.lineHeight !== undefined) {
      const fontSize = opts.fontSize ?? style.fontSize ?? 40;
      opts.lineHeight = style.lineHeight / fontSize;
    }
    if (originalOpts.letterSpacing !== undefined) {
      opts.letterSpacing = originalOpts.letterSpacing;
    } else if (style.letterSpacing !== undefined) {
      opts.letterSpacing = style.letterSpacing;
    }

    const newClip = new Text(this.text, opts) as this;
    await newClip.ready;
    this.copyStateTo(newClip);
    newClip.id = this.id;
    newClip.effects = [...this.effects];
    return newClip;
  }

  /**
   * Update text styling options and refresh the texture
   */
  async updateStyle(opts: Partial<ITextOpts>): Promise<void> {
    const processedOpts = this._normalizeStyleOpts(opts);
    this.originalOpts = { ...this.originalOpts, ...processedOpts } as ITextOpts;
    this._buildTextStyles();
    await this.refreshText();
    this.emit("propsChange", opts);
  }

  private _populateWordCache(
    words: string[],
    textOnlyContainer: import("pixi.js").Container,
    spaceWidth: number,
    measuredTextHeight: number,
    lineHeightMultiplier: number,
    fontSize: number,
  ): void {
    this._wordCache = this.wordTexts.map((textObj, i) => ({
      text: words[i],
      width: Math.ceil(textObj.getLocalBounds().width || textObj.width),
      height: Math.ceil(textObj.getLocalBounds().height || textObj.height),
      textObj,
    }));
    this._spaceWidth = spaceWidth;
    this._measuredTextHeight = measuredTextHeight;
    this._lineHeightMultiplier = lineHeightMultiplier;
    this._fontSize = fontSize;
    this._textOnlyContainer = textOnlyContainer;
  }

  /**
   * Fast layout update for real-time transform operations.
   * Re-calculates word wrapping and repositions existing text objects without
   * re-creating them. Much faster than full refreshText() for resize operations.
   *
   * @param targetWidth - The new target width for wrapping
   * @returns Object with new width and height
   */
  updateLayoutForWidth(targetWidth: number): { width: number; height: number } {
    if (!this._wordCache.length || !this._textOnlyContainer || !this.pixiTextContainer) {
      // Fall back to full refresh if cache not populated
      this._targetWidth = targetWidth;
      void this.refreshText();
      return { width: this.width, height: this.height };
    }

    const bgPadX = this.originalOpts.background?.paddingX ?? 8;
    const bgPadY = this.originalOpts.background?.paddingY ?? 4;
    const lineHeightMultiplier = this._lineHeightMultiplier;
    const fontSize = this._fontSize;
    const lineHeight = fontSize * lineHeightMultiplier;
    const measuredTextHeight = this._measuredTextHeight;
    const spaceWidth = this._spaceWidth;

    // Calculate wrap width (inner text area)
    const wrapWidth = Math.max(1, targetWidth - bgPadX * 2);

    // Fast line breaking using cached word widths
    const lines: Array<{ wordIndices: number[]; width: number; height: number }> = [];
    let currentLine: number[] = [];
    let currentLineWidth = 0;
    let currentLineHeight = 0;

    for (let i = 0; i < this._wordCache.length; i++) {
      const word = this._wordCache[i];
      const wordWidth = word.width;
      const wordHeight = word.height;

      const projectedWidth = currentLineWidth + (currentLineWidth > 0 ? spaceWidth : 0) + wordWidth;
      if (projectedWidth <= wrapWidth || currentLine.length === 0) {
        currentLine.push(i);
        currentLineWidth = projectedWidth;
        currentLineHeight = Math.max(currentLineHeight, wordHeight);
      } else {
        if (currentLine.length > 0) {
          lines.push({
            wordIndices: currentLine,
            width: currentLineWidth,
            height: Math.max(currentLineHeight, lineHeight),
          });
        }
        currentLine = [i];
        currentLineWidth = wordWidth;
        currentLineHeight = wordHeight;
      }
    }

    if (currentLine.length > 0) {
      lines.push({
        wordIndices: currentLine,
        width: currentLineWidth,
        height: Math.max(currentLineHeight, lineHeight),
      });
    }

    // Calculate total height
    const bgLineHeight = measuredTextHeight + bgPadY * 2;
    lines.forEach((line) => {
      line.height = Math.max(line.height, bgLineHeight);
    });

    let maxLineWidth = 0;
    let totalHeight = 0;
    lines.forEach((line) => {
      maxLineWidth = Math.max(maxLineWidth, line.width);
      totalHeight += line.height;
    });

    // Container dimensions
    const contentWidth = maxLineWidth + bgPadX * 2;
    const contentHeight = totalHeight;
    const containerWidth = Math.max(contentWidth, targetWidth);
    const containerHeight = contentHeight; // Always auto-height during transform

    // Position words within container
    const finalAlign = this.textAlign;
    const finalVAlign = (this.originalOpts as any).verticalAlign || "top";

    let startY = 0;
    if (finalVAlign === "center") {
      startY = (containerHeight - contentHeight) / 2;
    } else if (finalVAlign === "bottom") {
      startY = containerHeight - contentHeight;
    }

    let currentY = startY;
    lines.forEach((line) => {
      let currentX = 0;
      if (finalAlign === "center") {
        currentX = (containerWidth - line.width) / 2;
      } else if (finalAlign === "right") {
        currentX = containerWidth - line.width - bgPadX * 2;
      } else {
        currentX = bgPadX;
      }

      line.wordIndices.forEach((wordIndex, wordIdxInLine) => {
        const word = this._wordCache[wordIndex];
        if (word.textObj) {
          word.textObj.x = Math.round(currentX);
          word.textObj.y = Math.round(currentY + (line.height - measuredTextHeight) / 2 - 9);
        }
        currentX += word.width + (wordIdxInLine < line.wordIndices.length - 1 ? spaceWidth : 0);
      });

      currentY += line.height;
    });

    // Update clip dimensions
    this._meta.width = containerWidth;
    this._meta.height = containerHeight;
    (this as any)._width = containerWidth;
    (this as any)._height = containerHeight;
    this._targetWidth = containerWidth;

    // Update render texture if dimensions changed significantly
    const newPaddedWidth = containerWidth + (this.renderTexturePadding ?? 0) * 2;
    const newPaddedHeight = containerHeight + (this.renderTexturePadding ?? 0) * 2;
    if (
      this.renderTexture &&
      (Math.abs(this.renderTexture.width - newPaddedWidth) > 10 ||
        Math.abs(this.renderTexture.height - newPaddedHeight) > 10)
    ) {
      // Re-render to update texture dimensions
      void this.getTexture();
    }

    return { width: containerWidth, height: containerHeight };
  }

  toJSON(main: boolean = false): TextJSON {
    const base = super.toJSON(main);

    // Build style object from originalOpts
    const style: TextStyleJSON = {};
    if (this.originalOpts.fontSize !== undefined) style.fontSize = this.originalOpts.fontSize;
    if (this.originalOpts.fontFamily !== undefined) style.fontFamily = this.originalOpts.fontFamily;
    if (this.originalOpts.fontWeight !== undefined)
      style.fontWeight = this.originalOpts.fontWeight as any;
    if (this.originalOpts.fontStyle !== undefined) style.fontStyle = this.originalOpts.fontStyle;
    if (this.originalOpts.color !== undefined) style.color = this.originalOpts.color as any;
    if (this.originalOpts.align !== undefined) style.align = this.originalOpts.align;
    if (this.originalOpts.wordWrap !== undefined) style.wordWrap = this.originalOpts.wordWrap;
    if (this.originalOpts.wordWrapWidth !== undefined)
      style.wordWrapWidth = this.originalOpts.wordWrapWidth;
    if (this.originalOpts.lineHeight !== undefined) style.lineHeight = this.originalOpts.lineHeight;
    if (this.originalOpts.letterSpacing !== undefined)
      style.letterSpacing = this.originalOpts.letterSpacing;

    // Background options
    if (this.originalOpts.background !== undefined) style.background = this.originalOpts.background;

    // Handle stroke
    if (this.originalOpts.stroke) {
      if (typeof this.originalOpts.stroke === "object") {
        style.stroke = {
          color: this.originalOpts.stroke.color as any,
          width: this.originalOpts.stroke.width,
          join: this.originalOpts.stroke.join,
          cap: (this.originalOpts.stroke as any).cap, // cap might be missing from ITextOpts definition but present in object
          miterLimit: (this.originalOpts.stroke as any).miterLimit,
        };
      } else {
        style.stroke = {
          color: this.originalOpts.stroke as any,
          width: this.originalOpts.strokeWidth ?? 0,
        };
      }
    }

    if (this.originalOpts.shadow) {
      style.shadow = {
        color: (this.originalOpts.shadow.color ?? "#000000") as string,
        alpha: this.originalOpts.shadow.alpha ?? 0.5,
        blur: this.originalOpts.shadow.blur ?? 4,
        offsetX: this.originalOpts.shadow.offsetX ?? 0,
        offsetY: this.originalOpts.shadow.offsetY ?? 0,
      };
    }

    return {
      ...base,
      type: "Text",
      text: this.text,
      style,
      id: this.id,
      effects: this.effects,
    } as TextJSON;
  }

  /**
   * Create a Text instance from a JSON object (fabric.js pattern)
   * @param json The JSON object representing the clip
   * @returns Promise that resolves to a Text instance
   */
  static async fromObject(json: TextJSON): Promise<Text> {
    if (json.type !== "Text") {
      throw new Error(`Expected Text, got ${json.type}`);
    }

    // Support new structure (text + style) and old structure (options)
    const text = json.text || "";
    const style = json.style || {};

    // Build options object from style
    const textClipOpts: ITextOpts = {};
    if (style.fontSize !== undefined) textClipOpts.fontSize = style.fontSize;
    if (style.fontFamily !== undefined) textClipOpts.fontFamily = style.fontFamily;
    if (style.fontWeight !== undefined) textClipOpts.fontWeight = style.fontWeight as any;
    if (style.fontStyle !== undefined) textClipOpts.fontStyle = style.fontStyle;
    if (style.color !== undefined) textClipOpts.color = style.color;
    if (style.align !== undefined) textClipOpts.align = style.align;
    if (style.wordWrap !== undefined) textClipOpts.wordWrap = style.wordWrap;
    if (style.wordWrapWidth !== undefined) textClipOpts.wordWrapWidth = style.wordWrapWidth;
    if (style.lineHeight !== undefined) textClipOpts.lineHeight = style.lineHeight;
    if (style.letterSpacing !== undefined) textClipOpts.letterSpacing = style.letterSpacing;

    // Background options
    if (style.background !== undefined) textClipOpts.background = style.background;

    // Handle stroke
    if (style.stroke) {
      if (style.stroke.join || style.stroke.cap || style.stroke.miterLimit !== undefined) {
        textClipOpts.stroke = {
          color: style.stroke.color,
          width: style.stroke.width,
          join: style.stroke.join,
          cap: style.stroke.cap,
          miterLimit: style.stroke.miterLimit,
        };
      } else {
        textClipOpts.stroke = style.stroke.color;
        textClipOpts.strokeWidth = style.stroke.width;
      }
    }

    if (style.shadow) {
      textClipOpts.shadow = {
        color: style.shadow.color,
        alpha: style.shadow.alpha,
        blur: style.shadow.blur,
        offsetX: style.shadow.offsetX ?? 0,
        offsetY: style.shadow.offsetY ?? 0,
      };
    }

    const clip = new Text(text, textClipOpts);

    BaseClip.deserializeBaseProperties(clip, json);

    // Apply text-specific effects if present
    if ((json as any).effects) {
      clip.effects = (json as any).effects;
    }

    await clip.ready;
    return clip;
  }

  /**
   * Override handle visibility for text clips
   * Text clips should only show: mr (mid-right), mb (mid-bottom), br (bottom-right), and rot (rotation)
   * This allows resizing width and height independently while preventing corner handles that might distort text
   */
  override getVisibleHandles(): Array<
    "tl" | "tr" | "bl" | "br" | "ml" | "mr" | "mt" | "mb" | "rot"
  > {
    return ["mr", "mb", "br", "rot"];
  }
}
