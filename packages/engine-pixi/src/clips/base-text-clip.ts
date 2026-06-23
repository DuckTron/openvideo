import {
  type Application,
  SplitBitmapText,
  TextStyle,
  RenderTexture,
  Color,
  FillGradient,
  type Texture,
  Container,
  Graphics,
  CanvasTextMetrics,
  BitmapFont,
  Cache,
} from "pixi.js";
import { OutlineFilter } from "../filters/outline-filter";
import { DropShadowFilter } from "pixi-filters";
import { Log } from "../utils/log";
import { BaseClip } from "./base-clip";
import type { IClip } from "./iclip";
import { parseColor, resolveColor } from "../utils/color";
import type { BaseSpriteEvents } from "../sprite/base-sprite";

/**
 * Shared style options used by both Text and Caption clips.
 */
export interface IBaseTextOpts {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  fontUrl?: string;
  color?:
    | string
    | number
    | {
        type: "gradient";
        x0: number;
        y0: number;
        x1: number;
        y1: number;
        colors: Array<{ ratio: number; color: string | number }>;
      };
  stroke?:
    | string
    | number
    | {
        color: string | number;
        width: number;
        join?: "miter" | "round" | "bevel";
        cap?: "butt" | "round" | "square";
        miterLimit?: number;
      };
  strokeWidth?: number;
  align?: "left" | "center" | "right";
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "center" | "bottom" | "underline" | "overline" | "strikethrough";
  shadow?: {
    color?: string | number;
    alpha?: number;
    blur?: number;
    offsetX?: number;
    offsetY?: number;
  };
  wordWrapWidth?: number;
  wordWrap?: boolean;
  lineHeight?: number;
  letterSpacing?: number;
  textCase?: "none" | "uppercase" | "lowercase" | "title";
  background?: {
    color?: string;
    opacity?: number;
    borderRadius?: number;
    paddingX?: number;
    paddingY?: number;
  };
}

export function getOrInstallFont(styleOptions: any): string {
  const parts: string[] = [];
  parts.push(styleOptions.fontFamily || "Roboto");
  parts.push(String(styleOptions.fontSize || 30));
  parts.push(String(styleOptions.fontWeight || "normal"));
  parts.push(String(styleOptions.fontStyle || "normal"));

  if (styleOptions.fill !== undefined) {
    if (typeof styleOptions.fill === "number") {
      parts.push(`f_${styleOptions.fill}`);
    } else {
      parts.push("f_obj");
    }
  }

  if (styleOptions.stroke) {
    if (typeof styleOptions.stroke === "object") {
      parts.push(
        `s_${styleOptions.stroke.color}_${styleOptions.stroke.width}_${styleOptions.stroke.join || ""}`,
      );
    } else {
      parts.push(`s_${styleOptions.stroke}`);
    }
  }

  if (styleOptions.dropShadow) {
    parts.push(
      `ds_${styleOptions.dropShadow.color}_${styleOptions.dropShadow.alpha}_${styleOptions.dropShadow.blur}_${styleOptions.dropShadow.angle}_${styleOptions.dropShadow.distance}`,
    );
  }

  const fontName = "installed_font_" + parts.join("_").replace(/[^a-zA-Z0-9_]/g, "_");

  if (!Cache.has(fontName) && !Cache.has(fontName + "-bitmap")) {
    BitmapFont.install({
      name: fontName,
      style: styleOptions,
    });
  }

  return fontName;
}

/**
 * Abstract base class for text-based clips (Text and Caption).
 * Contains all shared PixiJS rendering infrastructure.
 * Subclasses must implement: `get text()`, `get textAlign()`, and `refreshContent()`.
 */
export abstract class BaseTextClip<
  TEvents extends BaseSpriteEvents = BaseSpriteEvents,
> extends BaseClip<TEvents> {
  declare ready: IClip["ready"];

  protected _meta = {
    duration: Infinity,
    width: 0,
    height: 0,
  };

  get meta() {
    return { ...this._meta };
  }

  protected pixiTextContainer: Container | null = null;
  protected wordTexts: SplitBitmapText[] = [];
  protected textStyle!: TextStyle;
  protected textStyleBase!: TextStyle;
  protected renderTexture: RenderTexture | null = null;
  protected outlineFilter: OutlineFilter | null = null;
  protected dropShadowFilter: DropShadowFilter | null = null;

  protected _refreshing = false;
  protected _needsRefresh = false;
  protected _spaceWidth = 0;
  protected _text: string = "";

  private externalRenderer: Application["renderer"] | null = null;
  private pixiApp: Application | null = null;

  public originalOpts!: IBaseTextOpts;

  id: string = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  effects: Array<{
    id: string;
    key: string;
    startTime: number;
    duration: number;
  }> = [];

  /**
   * The text string to render. Implemented by subclasses.
   */
  abstract get text(): string;

  /**
   * Horizontal text alignment. Implemented by subclasses.
   */
  abstract get textAlign(): "left" | "center" | "right";

  setRenderer(renderer: Application["renderer"]): void {
    this.externalRenderer = renderer;
  }

  protected async getRenderer(): Promise<Application["renderer"]> {
    if (this.externalRenderer != null) return this.externalRenderer;
    if (this.pixiApp?.renderer == null) {
      throw new Error("BaseTextClip: No renderer. Provide one via constructor or setRenderer().");
    }
    return this.pixiApp.renderer;
  }

  async getTexture(): Promise<Texture | null> {
    if (this.pixiTextContainer == null || this.renderTexture == null) return null;
    const renderer = await this.getRenderer();
    renderer.render({ container: this.pixiTextContainer, target: this.renderTexture });
    return this.renderTexture;
  }

  async tick(_time: number): Promise<{ video: ImageBitmap; state: "success" }> {
    await this.ready;
    if (this.pixiTextContainer == null || this.renderTexture == null) {
      throw new Error("BaseTextClip not initialized");
    }
    if (this.renderTexture.width <= 0 || this.renderTexture.height <= 0) {
      throw new Error(
        `Invalid RenderTexture dimensions: ${this.renderTexture.width}x${this.renderTexture.height}`,
      );
    }

    const renderer = await this.getRenderer();
    renderer.render({ container: this.pixiTextContainer, target: this.renderTexture });

    const source = this.renderTexture.source?.resource?.source;
    let imageBitmap: ImageBitmap;

    if (source instanceof HTMLCanvasElement || source instanceof OffscreenCanvas) {
      imageBitmap = await createImageBitmap(source);
    } else {
      const extract = renderer.extract;
      const extractedCanvas = extract.canvas(this.renderTexture);
      if (
        extractedCanvas instanceof HTMLCanvasElement ||
        extractedCanvas instanceof OffscreenCanvas
      ) {
        imageBitmap = await createImageBitmap(extractedCanvas);
      } else {
        throw new Error("Unable to extract canvas from render texture");
      }
    }

    return { video: imageBitmap, state: "success" };
  }

  async split(_time: number): Promise<[this, this]> {
    await this.ready;
    const clone1 = await this.clone();
    const clone2 = await this.clone();
    return [clone1, clone2];
  }

  abstract clone(): Promise<this>;

  override animate(time: number): void {
    super.animate(time, this.pixiTextContainer);
  }

  addEffect(effect: { id: string; key: string; startTime: number; duration: number }) {
    this.effects.push(effect);
  }

  editEffect(
    effectId: string,
    newEffectData: Partial<{ key: string; startTime: number; duration: number }>,
  ) {
    const effect = this.effects.find((e) => e.id === effectId);
    if (effect) Object.assign(effect, newEffectData);
  }

  removeEffect(effectId: string) {
    const idx = this.effects.findIndex((e) => e.id === effectId);
    if (idx !== -1) this.effects.splice(idx, 1);
  }

  // ─── Rendering pipeline ──────────────────────────────────────────────────

  protected async refreshText(): Promise<void> {
    if (this._refreshing) {
      this._needsRefresh = true;
      return;
    }
    this._refreshing = true;
    this._needsRefresh = false;
    try {
      await this._doRefreshText();
    } finally {
      this._refreshing = false;
      if (this._needsRefresh) {
        this._needsRefresh = false;
        await this.refreshText();
      }
    }
  }

  protected async _doRefreshText(): Promise<void> {
    const snapshotWidth = (this as any)._targetWidth ?? 0;
    const snapshotWordWrap = this.originalOpts.wordWrap;
    const snapshotWordWrapWidth = this.originalOpts.wordWrapWidth;
    const snapshotBackground = this.originalOpts.background;

    if (typeof document !== "undefined") {
      await document.fonts.ready;
    }

    this._buildTextStyles();

    const style = this.textStyle;
    const textToRender = this._applyTextCase(this.text);

    if (!this.pixiTextContainer) {
      this.pixiTextContainer = new Container();
    } else {
      this.animations.forEach((anim) => {
        if (anim && typeof (anim as any).destroy === "function") {
          (anim as any).destroy();
        }
      });

      for (const child of this.pixiTextContainer.children) {
        if (child && !child.destroyed) {
          if (child.children) {
            for (const subChild of child.children) {
              if (subChild && subChild.label === "LineContainer") {
                subChild.mask = null;
              }
            }
          }
          child.destroy({ children: true });
        }
      }
      this.pixiTextContainer.removeChildren();
    }

    const { textOnlyContainer, words } = this._buildWordObjects(textToRender);
    const strokeWidth = this._applyStrokeFilter();
    this._applyShadowFilter(textOnlyContainer);

    this.pixiTextContainer.addChild(textOnlyContainer);

    const { spaceWidth, measuredTextHeight } = await this._measureSpaceAndHeight();
    this._spaceWidth = spaceWidth;

    const lineHeightMultiplier = this.originalOpts.lineHeight ?? 1;
    const fontSize = style.fontSize ?? 40;
    const lineHeight = fontSize * lineHeightMultiplier;

    let wrapWidth: number;
    if (snapshotWordWrap) {
      if (snapshotWidth > 0) {
        const liveBgPadX = snapshotBackground?.paddingX ?? 8;
        wrapWidth = Math.max(1, snapshotWidth - liveBgPadX * 2);
      } else {
        wrapWidth = snapshotWordWrapWidth ?? 100;
      }
    } else {
      wrapWidth = 1e5;
    }

    const lines = this._breakIntoLines(wrapWidth, lineHeight);

    const bgColorOpt = this.originalOpts.background?.color;
    const hasBg = !!bgColorOpt && bgColorOpt !== "transparent" && bgColorOpt !== "";
    const bgOpacity = this.originalOpts.background?.opacity ?? 1;
    const bgBorderRadius = this.originalOpts.background?.borderRadius ?? 4;
    const bgPadX = this.originalOpts.background?.paddingX ?? 8;
    const bgPadY = this.originalOpts.background?.paddingY ?? 4;

    const { containerWidth, containerHeight, contentHeight } = this._calculateDimensions(
      lines,
      measuredTextHeight,
      snapshotWidth,
      snapshotWordWrap,
      snapshotWordWrapWidth,
      snapshotBackground,
      bgPadX,
      bgPadY,
    );

    const lineRects = this._positionWords(
      lines,
      containerWidth,
      containerHeight,
      contentHeight,
      measuredTextHeight,
      bgPadX,
      hasBg,
      textOnlyContainer,
    );

    const decorationGraphics = this._drawDecoration(lines, containerWidth, bgPadX);
    if (decorationGraphics) this.pixiTextContainer.addChild(decorationGraphics);

    const bgGraphics = this._buildBackground(lineRects, bgColorOpt, bgOpacity, bgBorderRadius);
    if (bgGraphics) this.pixiTextContainer.addChildAt(bgGraphics, 0);

    this._createRenderTexture(containerWidth, containerHeight, strokeWidth);

    this._meta.width = containerWidth;
    this._meta.height = containerHeight;
    (this as any)._width = containerWidth;
    (this as any)._height = containerHeight;

    if (this.duration === 0 && this._meta.duration !== Infinity) {
      this.duration = this._meta.duration;
      this.display.to = this.display.from + this.duration;
    }

    this._onAfterRefresh(
      words,
      textOnlyContainer,
      spaceWidth,
      measuredTextHeight,
      lineHeightMultiplier,
      fontSize,
    );
  }

  /**
   * Hook called at the end of _doRefreshText. Subclasses can override to run
   * post-layout logic (e.g. populate word cache, apply initial word colors).
   */
  protected _onAfterRefresh(
    _words: string[],
    _textOnlyContainer: Container,
    _spaceWidth: number,
    _measuredTextHeight: number,
    _lineHeightMultiplier: number,
    _fontSize: number,
  ): void {
    // default: no-op
  }

  // ─── Style helpers ────────────────────────────────────────────────────────

  protected _applyTextCase(text: string): string {
    const textCase = this.originalOpts.textCase;
    if (textCase === "uppercase") return text.toUpperCase();
    if (textCase === "lowercase") return text.toLowerCase();
    if (textCase === "title")
      return text.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
      );
    return text;
  }

  protected _buildTextStyles(): { fontName: string; baseFontName: string } {
    const styleOptions = this.createStyleFromOpts(this.originalOpts);
    const {
      wordWrap: _ww,
      wordWrapWidth: _www,
      lineHeight: _lh,
      letterSpacing: _ls,
      fill: _f,
      ...rest
    } = styleOptions;
    const fontName = getOrInstallFont(styleOptions);
    this.textStyle = new TextStyle({ ...styleOptions, fontFamily: fontName });
    const baseFontName = getOrInstallFont(rest);
    this.textStyleBase = new TextStyle({ ...rest, fontFamily: baseFontName });
    return { fontName, baseFontName };
  }

  protected _buildWordObjects(textToRender: string): {
    textOnlyContainer: Container;
    words: string[];
  } {
    const words = textToRender.split(/\s+/).filter((v) => v.length > 0);
    const textOnlyContainer = new Container();
    textOnlyContainer.label = "TextOnlyContainer";

    this.wordTexts.forEach((w) => {
      if (w && !w.destroyed) {
        w.destroy();
      }
    });
    this.wordTexts = words.map((wordStr) => {
      const wordText = new SplitBitmapText({ text: wordStr, style: this.textStyle });
      textOnlyContainer.addChild(wordText);
      return wordText;
    });

    return { textOnlyContainer, words };
  }

  protected _applyStrokeFilter(): number {
    const strokeOpt = this.originalOpts.stroke;
    const strokeWidth =
      (strokeOpt !== null && typeof strokeOpt === "object" && "width" in strokeOpt
        ? strokeOpt.width
        : undefined) ??
      this.originalOpts.strokeWidth ??
      0;
    const hasStroke = strokeOpt != null && strokeWidth > 0;

    if (hasStroke) {
      let strokeColor = 0x000000;
      if (typeof strokeOpt === "object" && "color" in strokeOpt) {
        const parsed = parseColor(strokeOpt.color);
        if (parsed !== undefined) strokeColor = parsed;
      } else if (typeof strokeOpt === "string" || typeof strokeOpt === "number") {
        const parsed = parseColor(strokeOpt);
        if (parsed !== undefined) strokeColor = parsed;
      }

      if (this.outlineFilter) {
        this.outlineFilter.thickness = strokeWidth;
        this.outlineFilter.padding = strokeWidth * 4;
        const uniforms = this.outlineFilter.resources.outlineUniforms.uniforms;
        uniforms.uBorderColor = new Color(strokeColor);
      } else {
        this.outlineFilter = new OutlineFilter({
          thickness: strokeWidth,
          borderColor: strokeColor,
        });
      }

      this.wordTexts.forEach((wordText) => {
        wordText.filters = [this.outlineFilter!];
      });
    } else {
      if (this.outlineFilter) {
        this.wordTexts.forEach((wordText) => {
          wordText.filters = [];
        });
        this.outlineFilter = null;
      }
    }

    return hasStroke ? strokeWidth : 0;
  }

  protected _applyShadowFilter(textOnlyContainer: Container): void {
    const shadowOpt = this.originalOpts.shadow;
    if (shadowOpt) {
      const offsetX = shadowOpt.offsetX ?? 0;
      const offsetY = shadowOpt.offsetY ?? 0;
      const shadowColor = parseColor(shadowOpt.color ?? "#000000");
      const shadowAlpha = shadowOpt.alpha ?? 1;
      const shadowBlur = shadowOpt.blur ?? 4;
      const shadowFilterPadding = Math.ceil(
        shadowBlur * 2.5 + Math.max(Math.abs(offsetX), Math.abs(offsetY)),
      );

      if (shadowColor !== undefined) {
        if (this.dropShadowFilter) {
          this.dropShadowFilter.color = shadowColor;
          this.dropShadowFilter.alpha = shadowAlpha;
          this.dropShadowFilter.blur = shadowBlur;
          this.dropShadowFilter.offset = { x: offsetX, y: offsetY };
          this.dropShadowFilter.padding = shadowFilterPadding;
        } else {
          this.dropShadowFilter = new DropShadowFilter({
            color: shadowColor,
            alpha: shadowAlpha,
            blur: shadowBlur,
            offset: { x: offsetX, y: offsetY },
          });
          this.dropShadowFilter.padding = shadowFilterPadding;
        }
        textOnlyContainer.filters = [this.dropShadowFilter];
      }
    } else {
      if (this.dropShadowFilter) {
        textOnlyContainer.filters = [];
        this.dropShadowFilter = null;
      }
    }
  }

  protected async _measureSpaceAndHeight(): Promise<{
    spaceWidth: number;
    measuredTextHeight: number;
  }> {
    const spaceFs = this.originalOpts.fontSize || 40;
    const spaceFamily = this.originalOpts.fontFamily || "Arial";
    const spaceWeight = String(this.originalOpts.fontWeight || "normal");
    const spaceStyle = this.originalOpts.fontStyle || "normal";
    const fontSpec = `${spaceStyle} ${spaceWeight} ${spaceFs}px "${spaceFamily}"`;

    if (typeof document !== "undefined") {
      try {
        await document.fonts.load(fontSpec);
      } catch (_) {
        /* ignore */
      }
    }

    const spaceMeasureStyle = new TextStyle({
      fontFamily: spaceFamily,
      fontSize: spaceFs,
      fontWeight: spaceWeight as TextStyle["fontWeight"],
      fontStyle: spaceStyle as TextStyle["fontStyle"],
    });
    const metrics = CanvasTextMetrics.measureText(" ", spaceMeasureStyle);

    const textMeasureStyle = new TextStyle({
      fontFamily: spaceFamily,
      fontSize: spaceFs,
      fontWeight: spaceWeight as TextStyle["fontWeight"],
      fontStyle: spaceStyle as TextStyle["fontStyle"],
    });
    const textMeasureMetrics = CanvasTextMetrics.measureText("Hg", textMeasureStyle);
    const fontProps = textMeasureMetrics.fontProperties;
    const measuredTextHeight =
      fontProps && fontProps.ascent > 0 ? Math.ceil(fontProps.ascent + fontProps.descent) : spaceFs;

    const tempSpace = new SplitBitmapText({ text: " ", style: this.textStyleBase });
    const spaceWidth = Math.ceil(
      tempSpace.getLocalBounds().width || tempSpace.width || metrics.width || spaceFs * 0.25,
    );
    tempSpace.destroy();

    return { spaceWidth, measuredTextHeight };
  }

  protected _breakIntoLines(
    wrapWidth: number,
    lineHeight: number,
  ): { words: SplitBitmapText[]; width: number; height: number }[] {
    const lines: { words: SplitBitmapText[]; width: number; height: number }[] = [];
    let currentLine: SplitBitmapText[] = [];
    let currentLineWidth = 0;
    let currentLineHeight = 0;

    this.wordTexts.forEach((wordText) => {
      const bounds = wordText.getLocalBounds();
      const wordWidth = Math.ceil(bounds.width || wordText.width);
      const wordHeight = Math.ceil(bounds.height || wordText.height);
      const projectedWidth =
        currentLineWidth + (currentLineWidth > 0 ? this._spaceWidth : 0) + wordWidth;

      if (projectedWidth <= wrapWidth || currentLine.length === 0) {
        currentLine.push(wordText);
        currentLineWidth = projectedWidth;
        currentLineHeight = Math.max(currentLineHeight, wordHeight);
      } else {
        if (currentLine.length > 0) {
          lines.push({
            words: currentLine,
            width: currentLineWidth,
            height: Math.max(currentLineHeight, lineHeight),
          });
        }
        currentLine = [wordText];
        currentLineWidth = wordWidth;
        currentLineHeight = wordHeight;
      }
    });

    if (currentLine.length > 0) {
      lines.push({
        words: currentLine,
        width: currentLineWidth,
        height: Math.max(currentLineHeight, lineHeight),
      });
    }
    return lines;
  }

  protected _calculateDimensions(
    lines: { words: SplitBitmapText[]; width: number; height: number }[],
    measuredTextHeight: number,
    snapshotWidth: number,
    snapshotWordWrap: boolean | undefined,
    snapshotWordWrapWidth: number | undefined,
    snapshotBackground: IBaseTextOpts["background"],
    bgPadX: number,
    bgPadY: number,
  ): {
    containerWidth: number;
    containerHeight: number;
    contentWidth: number;
    contentHeight: number;
  } {
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

    let contentWidth = maxLineWidth;
    if (snapshotWordWrap && snapshotWidth > 0) {
      const snapshotBgPadX = snapshotBackground?.paddingX ?? 8;
      const innerTargetWidth = snapshotWidth - snapshotBgPadX * 2;
      contentWidth = Math.max(contentWidth, innerTargetWidth);
    } else if (snapshotWordWrap && snapshotWordWrapWidth != null && snapshotWordWrapWidth > 0) {
      contentWidth = Math.max(contentWidth, snapshotWordWrapWidth);
    }
    const contentHeight = totalHeight;

    contentWidth += bgPadX * 2;

    const effectiveWidth = snapshotWidth > 0 ? snapshotWidth : ((this as any)._width as number);
    const isAutoWidth = effectiveWidth === 0;
    const isAutoHeight = !(this as any)._explicitHeight || this.height === 0;

    const containerWidth = isAutoWidth ? contentWidth : Math.max(contentWidth, effectiveWidth);
    const containerHeight = isAutoHeight
      ? contentHeight
      : Math.max(contentHeight, this.height || 0);

    return { containerWidth, containerHeight, contentWidth, contentHeight };
  }

  protected _positionWords(
    lines: { words: SplitBitmapText[]; width: number; height: number }[],
    containerWidth: number,
    containerHeight: number,
    contentHeight: number,
    measuredTextHeight: number,
    bgPadX: number,
    hasBg: boolean,
    textOnlyContainer: Container,
  ): { x: number; y: number; w: number; h: number }[] {
    const finalVAlign = (this.originalOpts as any).verticalAlign || "top";
    let startY = 0;
    if (finalVAlign === "center") startY = (containerHeight - contentHeight) / 2;
    else if (finalVAlign === "bottom") startY = containerHeight - contentHeight;

    let currentY = startY;
    const lineRects: { x: number; y: number; w: number; h: number }[] = [];

    lines.forEach((line) => {
      let currentX = 0;
      const finalAlign = this.textAlign;
      if (finalAlign === "center") {
        currentX = (containerWidth - line.width) / 2;
      } else if (finalAlign === "right") {
        currentX = containerWidth - line.width - bgPadX * 2;
      } else {
        currentX = bgPadX;
      }

      const lineXStart = currentX;

      // Group words of this line into a LineContainer
      const lineContainer = new Container();
      lineContainer.label = "LineContainer";
      lineContainer.x = 0;
      lineContainer.y = 0;

      const hasMaskAnimation = this.animations.some((anim: any) => {
        return (
          anim &&
          anim.params &&
          (anim.params.preset === "slideMaskWord" || anim.params.mask === true)
        );
      });

      if (hasMaskAnimation) {
        // Draw a rectangular Graphics mask matching the line coordinates
        const mask = new Graphics();
        mask.label = "LineMask";
        // Mask vertically using currentY and line.height.
        // Horizontally, span the entire width of the container.
        mask.rect(0, currentY, containerWidth, line.height);
        mask.fill(0xffffff);
        lineContainer.mask = mask;

        // Add mask to textOnlyContainer
        textOnlyContainer.addChild(mask);
      }

      // Add lineContainer to textOnlyContainer
      textOnlyContainer.addChild(lineContainer);

      line.words.forEach((wordText, wordIndex) => {
        wordText.x = Math.round(currentX);
        wordText.y = Math.round(currentY + (line.height - measuredTextHeight) / 2 - 9);
        currentX +=
          (wordText.getLocalBounds().width || wordText.width) +
          (wordIndex < line.words.length - 1 ? this._spaceWidth : 0);

        // Move the word into the LineContainer
        lineContainer.addChild(wordText);
      });

      if (hasBg) {
        lineRects.push({
          x: lineXStart - bgPadX,
          y: currentY,
          w: line.width + bgPadX * 2,
          h: line.height,
        });
      }

      currentY += line.height;
    });

    return lineRects;
  }

  protected _drawDecoration(
    lines: { words: SplitBitmapText[]; width: number; height: number }[],
    containerWidth: number,
    bgPadX: number,
  ): Graphics | null {
    const decoration =
      (this.originalOpts as any).textDecoration || (this.originalOpts as any).verticalAlign;
    if (
      !decoration ||
      decoration === "none" ||
      !["underline", "overline", "strikethrough", "line-through"].includes(decoration)
    ) {
      return null;
    }

    const style = this.textStyle;
    const fontSize = style.fontSize ?? 40;
    const finalDecoration = decoration === "strikethrough" ? "line-through" : decoration;
    const lineThickness = Math.max(1, fontSize / 12);

    let lineColor = 0xffffff;
    if (typeof style.fill === "number") lineColor = style.fill;

    const graphics = new Graphics();
    let currentY = 0;

    lines.forEach((line) => {
      let lineXStart = bgPadX;
      const finalAlign = this.textAlign;
      if (finalAlign === "center") lineXStart = (containerWidth - line.width) / 2;
      else if (finalAlign === "right") lineXStart = containerWidth - line.width - bgPadX * 2;

      let yOffset = 0;
      if (finalDecoration === "underline") yOffset = line.height;
      else if (finalDecoration === "line-through") yOffset = line.height / 2;

      graphics.rect(lineXStart, currentY + yOffset, line.width, lineThickness);
      graphics.fill(lineColor);
      currentY += line.height;
    });

    return graphics;
  }

  protected _buildBackground(
    lineRects: { x: number; y: number; w: number; h: number }[],
    bgColorOpt: string | undefined,
    bgOpacity: number,
    bgBorderRadius: number,
  ): Graphics | null {
    if (!lineRects.length || !bgColorOpt || bgColorOpt === "transparent" || bgColorOpt === "") {
      return null;
    }
    const parsedBgColor = parseColor(bgColorOpt);
    const bgGraphics = new Graphics();
    this.drawRoundedMultilinePath(
      bgGraphics,
      lineRects,
      bgBorderRadius,
      parsedBgColor ?? 0x000000,
      bgOpacity,
    );
    return bgGraphics;
  }

  protected _createRenderTexture(
    containerWidth: number,
    containerHeight: number,
    strokeWidth: number,
  ): void {
    const ANIM_PAD = 300;
    const filterPadding = strokeWidth > 0 ? strokeWidth * 2.1 : 0;
    let shadowPadding = 0;
    if (this.dropShadowFilter) {
      const shadowBlur = this.dropShadowFilter.blur ?? 0;
      const shadowOffset = this.dropShadowFilter.offset;
      const shadowDistance = shadowOffset
        ? Math.sqrt(shadowOffset.x ** 2 + shadowOffset.y ** 2)
        : 0;
      shadowPadding = shadowBlur + shadowDistance;
    }
    const totalPad = ANIM_PAD + filterPadding + shadowPadding;
    const paddedWidth = containerWidth + totalPad * 2;
    const paddedHeight = containerHeight + totalPad * 2;

    if (this.pixiTextContainer) {
      this.pixiTextContainer.x = totalPad;
      this.pixiTextContainer.y = totalPad;
    }

    if (this.renderTexture) this.renderTexture.destroy();
    this.renderTexture = RenderTexture.create({ width: paddedWidth, height: paddedHeight });
    this.renderTexturePadding = totalPad;
  }

  protected _normalizeStyleOpts(opts: Partial<IBaseTextOpts>): Partial<IBaseTextOpts> {
    let processed = { ...opts } as any;

    if (processed.style) {
      processed = { ...processed, ...processed.style };
      delete processed.style;
    }
    if (processed.fill !== undefined) {
      processed.color = processed.fill;
      delete processed.fill;
    }
    if (processed.dropShadow !== undefined) {
      processed.shadow = processed.dropShadow;
      delete processed.dropShadow;
    }
    if (processed.textAlign !== undefined) {
      processed.align = processed.textAlign;
      delete processed.textAlign;
    }

    const hasUnderline = processed.underline;
    const hasOverline = processed.overline;
    const hasLinethrough = processed.linethrough;
    if (hasUnderline !== undefined || hasOverline !== undefined || hasLinethrough !== undefined) {
      if (hasUnderline) processed.textDecoration = "underline";
      else if (hasOverline) processed.textDecoration = "overline";
      else if (hasLinethrough) processed.textDecoration = "line-through";
      else processed.textDecoration = "none";
      delete processed.underline;
      delete processed.overline;
      delete processed.linethrough;
    }

    return processed as Partial<IBaseTextOpts>;
  }

  protected _cloneColorOpts(colorToNumber: (c: any) => number | undefined): IBaseTextOpts["color"] {
    const originalOpts = this.originalOpts;
    if (
      originalOpts.color &&
      typeof originalOpts.color === "object" &&
      "type" in originalOpts.color &&
      originalOpts.color.type === "gradient"
    ) {
      return originalOpts.color;
    }
    return colorToNumber(this.textStyle.fill) ?? 0xffffff;
  }

  protected _cloneStrokeOpts(colorToNumber: (c: any) => number | undefined): {
    stroke: IBaseTextOpts["stroke"];
    strokeWidth: number;
  } {
    const originalOpts = this.originalOpts;
    const style = this.textStyle;
    if (
      originalOpts.stroke &&
      typeof originalOpts.stroke === "object" &&
      "color" in originalOpts.stroke
    ) {
      return { stroke: originalOpts.stroke, strokeWidth: 0 };
    }
    const strokeColor = colorToNumber(style.stroke);
    const strokeWidth = originalOpts.strokeWidth ?? (style as any).strokeThickness ?? 0;
    return { stroke: strokeColor !== undefined ? strokeColor : undefined, strokeWidth };
  }

  protected _cloneShadowOpts(
    colorToNumber: (c: any) => number | undefined,
  ): IBaseTextOpts["shadow"] | undefined {
    const originalOpts = this.originalOpts;
    const style = this.textStyle;
    if (originalOpts.shadow) return originalOpts.shadow;
    if (style.dropShadow) {
      const ds = style.dropShadow;
      const shadowColor = colorToNumber(ds.color);
      if (shadowColor !== undefined) {
        const angle = ds.angle ?? 0;
        const distance = ds.distance ?? 0;
        return {
          color: shadowColor,
          alpha: ds.alpha,
          blur: ds.blur,
          offsetX: Math.cos(angle) * distance,
          offsetY: Math.sin(angle) * distance,
        };
      }
    }
    return undefined;
  }

  protected createStyleFromOpts(opts: IBaseTextOpts): any {
    const fontSize = opts.fontSize ?? 40;
    const lineHeightMultiplier = opts.lineHeight ?? 1;

    const styleOptions: any = {
      fontSize,
      fontFamily: opts.fontFamily ?? "Roboto",
      fontWeight: (opts.fontWeight as any) ?? "normal",
      fontStyle: opts.fontStyle ?? "normal",
      align: opts.align ?? "left",
      wordWrap: opts.wordWrap ?? false,
      wordWrapWidth: opts.wordWrapWidth ?? 100,
      lineHeight: fontSize * lineHeightMultiplier,
      letterSpacing: opts.letterSpacing ?? 0,
    };

    const colorOpt = opts.color ?? "#ffffff";
    if (
      colorOpt &&
      typeof colorOpt === "object" &&
      "type" in colorOpt &&
      colorOpt.type === "gradient"
    ) {
      const gradient = new FillGradient(colorOpt.x0, colorOpt.y0, colorOpt.x1, colorOpt.y1);
      colorOpt.colors.forEach(({ ratio, color }) => {
        const colorNumber = typeof color === "number" ? color : (parseColor(color) ?? 0xffffff);
        gradient.addColorStop(ratio, colorNumber);
      });
      styleOptions.fill = { fill: gradient };
    } else {
      const { color: fillColor, alpha: fillAlpha } = resolveColor(colorOpt as string);
      styleOptions.fill = fillColor;
      if (fillAlpha < 1) {
        styleOptions.fillAlpha = fillAlpha;
      }
    }

    return styleOptions;
  }

  protected drawRoundedMultilinePath(
    graphics: Graphics,
    rects: { x: number; y: number; w: number; h: number }[],
    radius: number,
    color: number,
    alpha: number = 1,
  ) {
    if (rects.length === 0) return;

    const threshold = Math.max(radius * 0.8, 15);
    let changed = true;
    let passes = 0;
    while (changed && passes < 5) {
      changed = false;
      passes++;
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const r1Right = rects[i].x + rects[i].w;
          const r2Right = rects[j].x + rects[j].w;
          if (Math.abs(r1Right - r2Right) > 0.1 && Math.abs(r1Right - r2Right) < threshold) {
            const maxR = Math.max(r1Right, r2Right);
            rects[i].w = maxR - rects[i].x;
            rects[j].w = maxR - rects[j].x;
            changed = true;
          }
          if (
            Math.abs(rects[i].x - rects[j].x) > 0.1 &&
            Math.abs(rects[i].x - rects[j].x) < threshold
          ) {
            const minX = Math.min(rects[i].x, rects[j].x);
            rects[i].w += rects[i].x - minX;
            rects[i].x = minX;
            rects[j].w += rects[j].x - minX;
            rects[j].x = minX;
            changed = true;
          }
        }
      }
    }

    const points: { x: number; y: number }[] = [];
    points.push({ x: rects[0].x, y: rects[0].y });
    points.push({ x: rects[0].x + rects[0].w, y: rects[0].y });

    for (let i = 0; i < rects.length - 1; i++) {
      const r1 = rects[i];
      const r2 = rects[i + 1];
      if (Math.abs(r1.x + r1.w - (r2.x + r2.w)) > 0.1) {
        const midY = (r1.y + r1.h + r2.y) / 2;
        points.push({ x: r1.x + r1.w, y: midY });
        points.push({ x: r2.x + r2.w, y: midY });
      }
    }

    points.push({
      x: rects[rects.length - 1].x + rects[rects.length - 1].w,
      y: rects[rects.length - 1].y + rects[rects.length - 1].h,
    });
    points.push({
      x: rects[rects.length - 1].x,
      y: rects[rects.length - 1].y + rects[rects.length - 1].h,
    });

    for (let i = rects.length - 1; i > 0; i--) {
      const r1 = rects[i];
      const r2 = rects[i - 1];
      if (Math.abs(r1.x - r2.x) > 0.1) {
        const midY = (r1.y + r2.y + r2.h) / 2;
        points.push({ x: r1.x, y: midY });
        points.push({ x: r2.x, y: midY });
      }
    }

    graphics.clear();
    const pLast = points[points.length - 1];
    const pFirst = points[0];
    graphics.moveTo((pLast.x + pFirst.x) / 2, (pLast.y + pFirst.y) / 2);
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      graphics.arcTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2, radius);
    }
    graphics.fill({ color, alpha });
  }

  destroy(): void {
    if (this.destroyed) return;
    Log.info(`${this.constructor.name} destroy`);

    try {
      if (this.pixiTextContainer != null && !this.pixiTextContainer.destroyed) {
        for (const child of this.pixiTextContainer.children) {
          if (child && !child.destroyed && child.children) {
            for (const subChild of child.children) {
              if (subChild && subChild.label === "LineContainer") {
                subChild.mask = null;
              }
            }
          }
        }
        this.pixiTextContainer.destroy({ children: true });
      }
    } catch (_) {
      /* ignore */
    } finally {
      this.pixiTextContainer = null;
    }

    try {
      if (this.renderTexture != null && !(this.renderTexture as any).destroyed) {
        this.renderTexture.destroy(true);
      }
    } catch (_) {
      /* ignore */
    } finally {
      this.renderTexture = null;
    }

    this.externalRenderer = null;

    if (this.pixiApp != null) {
      try {
        const anyApp = this.pixiApp as any;
        if (anyApp.destroyed !== true && anyApp.renderer != null) {
          this.pixiApp.destroy(true, { children: true, texture: true });
        }
      } catch (_) {
        /* ignore */
      } finally {
        this.pixiApp = null;
      }
    }

    super.destroy();
  }
}
