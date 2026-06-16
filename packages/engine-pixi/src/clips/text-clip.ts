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
import type { TextJSON, TextStyleJSON } from "../json-serialization";
import { parseColor, resolveColor } from "../utils/color";
import type { BaseSpriteEvents } from "../sprite/base-sprite";

export interface ITextOpts {
  /**
   * Font size in pixels
   * @default 40
   */
  fontSize?: number;
  /**
   * Font family
   * @default 'Roboto'
   */
  fontFamily?: string;
  /**
   * Font weight (e.g., 'normal', 'bold', '400', '700')
   * @default 'normal'
   */
  fontWeight?: string;
  /**
   * Font style (e.g., 'normal', 'italic')
   * @default 'normal'
   */
  fontStyle?: string;
  /**
   * Font URL for custom fonts
   */
  fontUrl?: string;
  /**
   * Text color (hex string, color name, or gradient object)
   * @default '#ffffff'
   */
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
  /**
   * Stroke color (hex string or color name) or stroke object with advanced options
   */
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
  /**
   * Stroke width in pixels (used when stroke is a simple color)
   * @default 0
   */
  strokeWidth?: number;
  /**
   * Text alignment ('left', 'center', 'right')
   * @default 'left'
   */
  align?: "left" | "center" | "right";
  /**
   * Alias for align to match UI property naming
   */
  textAlign?: "left" | "center" | "right";
  /**
   * Vertical alignment ('top', 'center', 'bottom')
   * @default 'top'
   */
  verticalAlign?: "top" | "center" | "bottom" | "underline" | "overline" | "strikethrough";
  /**
   * Shadow configuration
   */
  shadow?: {
    color?: string | number;
    alpha?: number;
    blur?: number;
    offsetX?: number;
    offsetY?: number;
  };
  /**
   * Word wrap width (0 = no wrap)
   * @default 0
   */
  wordWrapWidth?: number;
  /**
   * Word wrap mode ('break-word' or 'normal')
   * @default 'break-word'
   */
  wordWrap?: boolean;
  /**
   * Line height (multiplier)
   * @default 1
   */
  lineHeight?: number;
  /**
   * Letter spacing in pixels
   * @default 0
   */
  letterSpacing?: number;
  /**
   * Text case transformation
   * @default 'none'
   */
  textCase?: "none" | "uppercase" | "lowercase" | "title";
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
  /**
   * Per-line background box drawn behind each line of text.
   * When `color` is set (non-empty / non-transparent), a rounded rectangle
   * is rendered behind every line.
   */
  background?: {
    /** Fill color (hex string, e.g. '#ff0000') */
    color?: string;
    /** Fill opacity (0-1) @default 1 */
    opacity?: number;
    /** Corner radius in pixels @default 4 */
    borderRadius?: number;
    /** Horizontal padding in pixels added to each side @default 8 */
    paddingX?: number;
    /** Vertical padding in pixels added to each side @default 4 */
    paddingY?: number;
  };
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

function getOrInstallFont(styleOptions: any): string {
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
export class Text extends BaseClip<ITextEvents> {
  readonly type = "Text";
  ready: IClip["ready"];

  private _meta = {
    duration: Infinity,
    width: 0,
    height: 0,
  };

  get meta() {
    return { ...this._meta };
  }

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
      this.emit("propsChange", { width: v });
    });
  }

  override get height(): number {
    return (this as any)._height;
  }

  override set height(v: number) {
    if (Math.abs(this.height - v) < 0.1) return;
    (this as any)._height = v;
    this.refreshText().then(() => {
      this.emit("propsChange", { height: v });
    });
  }

  private _text: string = "";

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

  private pixiTextContainer: Container | null = null;
  private wordTexts: SplitBitmapText[] = [];
  private textStyle: TextStyle;
  private textStyleBase: TextStyle;
  private renderTexture: RenderTexture | null = null;
  private outlineFilter: OutlineFilter | null = null;
  private dropShadowFilter: DropShadowFilter | null = null;
  // Concurrency guard — prevents concurrent refreshText() calls from racing.
  // If a refresh is already in progress and another is requested, we set
  // _needsRefresh = true and re-run once the current refresh finishes.
  private _refreshing = false;
  private _needsRefresh = false;
  // The resize target set by the width setter. Kept separate from _width (which
  // _doRefreshText overwrites with the measured containerWidth at the end of each run).
  // Every _doRefreshText run — including the _needsRefresh re-run — reads this value
  // so the wrap layout is always based on the last explicit resize, not on a
  // previously measured output width.
  private _targetWidth = 0;
  // External renderer (preferred) - provided via constructor or setRenderer()
  // If not provided, Text will create its own minimal renderer as fallback
  private externalRenderer: Application["renderer"] | null = null;
  private pixiApp: Application | null = null; // Fallback renderer
  // Store original options for serialization to avoid accessing TextStyle properties
  public originalOpts: ITextOpts;

  /**
   * Unique identifier for this clip instance
   */
  id: string = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  /**
   * Array of effects to be applied to this clip
   * Each effect specifies key, startTime, duration, and optional targets
   */
  effects: Array<{
    id: string;
    key: string;
    startTime: number;
    duration: number;
  }> = [];

  constructor(text: string, opts: ITextOpts = {}, renderer?: Application["renderer"]) {
    super();
    // Store original options for serialization (shallow copy is fine since options are primitives)
    this.originalOpts = { ...opts };

    this.text = text;
    // Store external renderer if provided (e.g., from Studio)
    this.externalRenderer = renderer ?? null;

    // Create PixiJS TextStyle from options
    // Build style object conditionally to avoid passing undefined values
    const styleOptions = this.createStyleFromOpts(opts);
    const { wordWrap, wordWrapWidth, lineHeight, letterSpacing, fill, ...rest } = styleOptions;

    const fontName = getOrInstallFont(styleOptions);
    const style = new TextStyle({
      ...styleOptions,
      fontFamily: fontName,
    });

    const baseFontName = getOrInstallFont(rest);
    const styleBase = new TextStyle({
      ...rest,
      fontFamily: baseFontName,
    });

    this.textStyle = style;
    this.textStyleBase = styleBase;

    // Initialize Pixi Text to measure dimensions
    // Initialize Pixi Text to measure dimensions
    this.ready = (async () => {
      await this.refreshText();

      // Constructor specific: check if we need to set duration from meta
      const meta = { ...this._meta };
      return meta;
    })();
  }

  /**
   * Set an external renderer (e.g., from Studio) to avoid creating our own Pixi App
   * This is an optimization for Studio preview
   * Can be called before ready() completes
   */
  setRenderer(renderer: Application["renderer"]): void {
    this.externalRenderer = renderer;
  }

  /**
   * Get the renderer for rendering text to RenderTexture
   * Creates a minimal renderer as fallback if no external renderer is provided
   */
  private async getRenderer(): Promise<Application["renderer"]> {
    // Use external renderer if available (preferred)
    if (this.externalRenderer != null) {
      return this.externalRenderer;
    }

    if (this.pixiApp?.renderer == null) {
      throw new Error(
        "TextClip: Failed to create renderer. Please provide a renderer via constructor or setRenderer() method.",
      );
    }

    return this.pixiApp.renderer;
  }

  /**
   * Get the PixiJS Texture (RenderTexture) for optimized rendering in Studio
   * This avoids ImageBitmap → Canvas → Texture conversion
   *
   * @returns The RenderTexture containing the rendered text, or null if not ready
   */
  async getTexture(): Promise<Texture | null> {
    if (this.pixiTextContainer == null || this.renderTexture == null) {
      return null;
    }

    // Get renderer (creates fallback if needed)
    const renderer = await this.getRenderer();

    // Render the text to the render texture
    renderer.render({
      container: this.pixiTextContainer,
      target: this.renderTexture,
    });

    // RenderTexture extends Texture, so we can return it directly
    return this.renderTexture;
  }

  async tick(_time: number): Promise<{
    video: ImageBitmap;
    state: "success";
  }> {
    await this.ready;

    if (this.pixiTextContainer == null || this.renderTexture == null) {
      throw new Error("Text not initialized");
    }

    // Validate RenderTexture dimensions before rendering
    if (this.renderTexture.width <= 0 || this.renderTexture.height <= 0) {
      throw new Error(
        `Invalid RenderTexture dimensions: ${this.renderTexture.width}x${this.renderTexture.height}`,
      );
    }

    // Get renderer (creates fallback if needed)
    const renderer = await this.getRenderer();

    // Render Pixi Text to render texture
    renderer.render({
      container: this.pixiTextContainer,
      target: this.renderTexture,
    });

    // Extract pixels and create ImageBitmap
    // Get the texture's source (which should be a canvas)
    // Use Texture.source instead of baseTexture (PixiJS v8.0.0+)
    const source = this.renderTexture.source?.resource?.source;

    let imageBitmap: ImageBitmap;
    if (source instanceof HTMLCanvasElement) {
      // Use the canvas directly
      imageBitmap = await createImageBitmap(source);
    } else if (source instanceof OffscreenCanvas) {
      // Use OffscreenCanvas directly
      imageBitmap = await createImageBitmap(source);
    } else {
      // Fallback: use extract.canvas which should return a proper canvas
      // Get renderer for extract (creates fallback if needed)
      const rendererForExtract = await this.getRenderer();
      const extract = rendererForExtract.extract;
      const extractedCanvas = extract.canvas(this.renderTexture);
      // Convert ICanvas to HTMLCanvasElement or OffscreenCanvas
      if (
        extractedCanvas instanceof HTMLCanvasElement ||
        extractedCanvas instanceof OffscreenCanvas
      ) {
        imageBitmap = await createImageBitmap(extractedCanvas);
      } else {
        // Last resort: create a new canvas and draw the texture
        const width = this.renderTexture.width;
        const height = this.renderTexture.height;
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext("2d");
        if (ctx == null) {
          throw new Error("Failed to create 2d context for fallback rendering");
        }
        // We can't easily extract pixels, so throw an error
        throw new Error("Unable to extract canvas from render texture");
      }
    }

    return {
      video: imageBitmap,
      state: "success",
    };
  }

  async split(_time: number): Promise<[this, this]> {
    // For text clips, splitting just returns two clones since text doesn't change over time
    await this.ready;
    const clone1 = await this.clone();
    const clone2 = await this.clone();
    return [clone1, clone2];
  }

  override animate(time: number): void {
    super.animate(time, this.pixiTextContainer);
  }

  // Effects
  addEffect(effect: { id: string; key: string; startTime: number; duration: number }) {
    this.effects.push(effect);
  }

  editEffect(
    effectId: string,
    newEffectData: Partial<{
      key: string;
      startTime: number;
      duration: number;
    }>,
  ) {
    const effect = this.effects.find((e) => e.id === effectId);
    if (effect) {
      Object.assign(effect, newEffectData);
    }
  }

  removeEffect(effectId: string) {
    const effectIndex = this.effects.findIndex((e) => e.id === effectId);
    if (effectIndex !== -1) {
      this.effects.splice(effectIndex, 1);
    }
  }

  async clone() {
    await this.ready;
    // Use originalOpts when available (especially for gradients and complex objects)
    // Fall back to extracting from TextStyle for simple properties
    const style = this.textStyle;
    const originalOpts = this.originalOpts || {};

    // Helper to convert color to number
    const colorToNumber = (color: any): number | undefined => {
      if (color === undefined || color === null) return undefined;
      if (typeof color === "number") return color;
      if (color instanceof Color) return color.toNumber();
      return undefined;
    };

    // Start with original options (preserves gradients and complex objects)
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
    };

    // Handle color - prefer originalOpts to preserve gradients
    if (
      originalOpts.color &&
      typeof originalOpts.color === "object" &&
      "type" in originalOpts.color &&
      originalOpts.color.type === "gradient"
    ) {
      opts.color = originalOpts.color;
    } else {
      // Extract simple color fill from style
      const fillColor = colorToNumber(style.fill);
      opts.color = fillColor ?? 0xffffff;
    }

    // Handle stroke - prefer originalOpts to preserve advanced stroke options
    if (
      originalOpts.stroke &&
      typeof originalOpts.stroke === "object" &&
      "color" in originalOpts.stroke
    ) {
      opts.stroke = originalOpts.stroke;
    } else {
      // Extract simple stroke color from style
      const strokeColor = colorToNumber(style.stroke);
      if (strokeColor !== undefined) {
        opts.stroke = strokeColor;
        opts.strokeWidth = originalOpts.strokeWidth ?? (style as any).strokeThickness ?? 0;
      } else {
        opts.strokeWidth = originalOpts.strokeWidth ?? (style as any).strokeThickness ?? 0;
      }
    }

    // Extract shadow if present
    if (originalOpts.shadow) {
      opts.shadow = originalOpts.shadow;
    } else if (style.dropShadow) {
      const ds = style.dropShadow;
      const shadowColor = colorToNumber(ds.color);
      if (shadowColor !== undefined) {
        const angle = ds.angle ?? 0;
        const distance = ds.distance ?? 0;
        opts.shadow = {
          color: shadowColor,
          alpha: ds.alpha,
          blur: ds.blur,
          offsetX: Math.cos(angle) * distance,
          offsetY: Math.sin(angle) * distance,
        };
      }
    }

    // Extract other properties
    if (originalOpts.wordWrap !== undefined) {
      opts.wordWrap = originalOpts.wordWrap;
      opts.wordWrapWidth = originalOpts.wordWrapWidth;
    } else if (style.wordWrap) {
      opts.wordWrap = style.wordWrap;
      opts.wordWrapWidth = style.wordWrapWidth;
    }

    // Preserve background options
    if (originalOpts.background !== undefined) opts.background = originalOpts.background;

    if (originalOpts.lineHeight !== undefined) {
      opts.lineHeight = originalOpts.lineHeight;
    } else if (style.lineHeight !== undefined) {
      // CRITICAL: style.lineHeight is absolute pixels, but ITextOpts.lineHeight is a multiplier
      // Convert back to multiplier by dividing by fontSize
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
    // Copy id and effects
    newClip.id = this.id;
    newClip.effects = [...this.effects];
    return newClip;
  }

  /**
   * Update text styling options and refresh the texture
   * This is used for dynamic updates like resizing with text reflow
   */
  async updateStyle(opts: Partial<ITextOpts>): Promise<void> {
    // 1. Flatten style object if it exists (allows compatibility with editor's updates)
    let processedOpts = { ...opts };
    if ((opts as any).style) {
      processedOpts = { ...processedOpts, ...(opts as any).style };
      delete (processedOpts as any).style;
    }

    if ((processedOpts as any).fill !== undefined) {
      processedOpts.color = (processedOpts as any).fill;
      delete (processedOpts as any).fill;
    }

    if ((processedOpts as any).dropShadow !== undefined) {
      processedOpts.shadow = (processedOpts as any).dropShadow;
      delete (processedOpts as any).dropShadow;
    }

    // Map textAlign to align (UI uses textAlign, internal uses align)
    if ((processedOpts as any).textAlign !== undefined) {
      processedOpts.align = (processedOpts as any).textAlign;
      delete (processedOpts as any).textAlign;
    }

    // Map boolean decoration flags to textDecoration (UI sends booleans, internal uses enum)
    const hasUnderline = (processedOpts as any).underline;
    const hasOverline = (processedOpts as any).overline;
    const hasLinethrough = (processedOpts as any).linethrough;
    if (hasUnderline !== undefined || hasOverline !== undefined || hasLinethrough !== undefined) {
      if (hasUnderline) {
        processedOpts.textDecoration = "underline";
      } else if (hasOverline) {
        processedOpts.textDecoration = "overline";
      } else if (hasLinethrough) {
        processedOpts.textDecoration = "line-through";
      } else {
        processedOpts.textDecoration = "none";
      }
      delete (processedOpts as any).underline;
      delete (processedOpts as any).overline;
      delete (processedOpts as any).linethrough;
    }

    // 2. Update originalOpts with new values
    this.originalOpts = { ...this.originalOpts, ...processedOpts };

    // 3. Create new style options
    const styleOptions = this.createStyleFromOpts(this.originalOpts);
    const { wordWrap, wordWrapWidth, lineHeight, letterSpacing, fill, ...rest } = styleOptions;
    const baseFontName = getOrInstallFont(rest);
    const styleBase = new TextStyle({
      ...rest,
      fontFamily: baseFontName,
    });
    // 3. Update TextStyle
    const fontName = getOrInstallFont(styleOptions);
    const style = new TextStyle({
      ...styleOptions,
      fontFamily: fontName,
    });
    this.textStyle = style;
    this.textStyleBase = styleBase;

    // 4. Refresh text and texture
    await this.refreshText();
    this.emit("propsChange", opts);
  }

  /**
   * Refresh the internal Pixi Text and RenderTexture
   * Calculates dimensions based on text bounds and wrapping options
   */
  private async refreshText(): Promise<void> {
    // Concurrency guard: if a refresh is already running, defer until it finishes.
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
      // If a resize (or other change) happened while we were refreshing, re-run once.
      if (this._needsRefresh) {
        this._needsRefresh = false;
        await this.refreshText();
      }
    }
  }

  private async _doRefreshText(): Promise<void> {
    // Snapshot layout-relevant state BEFORE any await so concurrent mutations
    // (e.g. updateStyle() called from the store while fonts.ready is pending)
    // cannot change the values we use for word-wrap layout.
    // Use _targetWidth (set exclusively by the width setter) rather than _width
    // (which _doRefreshText itself overwrites with the measured containerWidth at
    // the end of each run — so it would give a stale value on the _needsRefresh re-run).
    const snapshotWidth = this._targetWidth;
    const snapshotWordWrap = this.originalOpts.wordWrap;
    const snapshotWordWrapWidth = this.originalOpts.wordWrapWidth;
    const snapshotBackground = this.originalOpts.background;

    if (typeof document !== "undefined") {
      await document.fonts.ready;
    }

    // Re-build textStyle here (after font load) so the BitmapFont atlas is built
    // with real glyph metrics — not fallback-font metrics from before the URL loaded.
    // This is critical for correct word-width measurement via SplitBitmapText.
    const styleOptions = this.createStyleFromOpts(this.originalOpts);
    const {
      wordWrap: _ww,
      wordWrapWidth: _www,
      lineHeight: _lh,
      letterSpacing: _ls,
      fill: _f,
      ...rest
    } = styleOptions;
    // Invalidate cached BitmapFonts so they are rebuilt with the now-loaded font.
    const fontName = getOrInstallFont(styleOptions);
    this.textStyle = new TextStyle({ ...styleOptions, fontFamily: fontName });
    const baseFontName = getOrInstallFont(rest);
    this.textStyleBase = new TextStyle({ ...rest, fontFamily: baseFontName });

    const style = this.textStyle;

    let textToRender = this.text;
    const textCase = this.originalOpts.textCase;

    if (textCase === "uppercase") {
      textToRender = textToRender.toUpperCase();
    } else if (textCase === "lowercase") {
      textToRender = textToRender.toLowerCase();
    } else if (textCase === "title") {
      textToRender = textToRender.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
      );
    }

    if (!this.pixiTextContainer) {
      this.pixiTextContainer = new Container();
    } else {
      this.pixiTextContainer.removeChildren();
    }

    // Split text into words for SplitBitmapText
    const words = textToRender.split(/\s+/).filter((v) => v.length > 0);

    // Use textStyle for words (includes fill color), shadow handled separately via DropShadowFilter
    const styleForWords = this.textStyle;

    // Cleanup old word texts
    this.wordTexts.forEach((w) => w.destroy());
    this.wordTexts = words.map((wordStr) => {
      const wordText = new SplitBitmapText({
        text: wordStr,
        style: styleForWords,
      });
      this.pixiTextContainer!.addChild(wordText);
      return wordText;
    });

    // Apply OutlineFilter for outline effect only
    const strokeOpt = this.originalOpts.stroke;

    // Check for width in stroke object or as separate strokeWidth property
    const strokeWidth =
      (strokeOpt !== null && typeof strokeOpt === "object" && "width" in strokeOpt
        ? strokeOpt.width
        : undefined) ??
      this.originalOpts.strokeWidth ??
      0;
    const hasStroke = strokeOpt != null && strokeWidth > 0;

    if (hasStroke) {
      // Determine stroke color
      let strokeColor = 0x000000; // default black
      if (typeof strokeOpt === "object" && "color" in strokeOpt) {
        const parsed = parseColor(strokeOpt.color);
        if (parsed !== undefined) strokeColor = parsed;
      } else if (typeof strokeOpt === "string" || typeof strokeOpt === "number") {
        const parsed = parseColor(strokeOpt);
        if (parsed !== undefined) strokeColor = parsed;
      }

      // Create or update OutlineFilter for outline
      if (this.outlineFilter) {
        this.outlineFilter.thickness = strokeWidth;
        const uniforms = this.outlineFilter.resources.outlineUniforms.uniforms;
        uniforms.uBorderColor = new Color(strokeColor);
      } else {
        this.outlineFilter = new OutlineFilter({
          thickness: strokeWidth,
          borderColor: strokeColor,
        });
      }

      // Apply filter to all word texts
      this.wordTexts.forEach((wordText) => {
        wordText.filters = [this.outlineFilter!];
      });
    } else {
      // Remove filter if no stroke
      if (this.outlineFilter) {
        this.wordTexts.forEach((wordText) => {
          wordText.filters = [];
        });
        this.outlineFilter = null;
      }
    }

    // Apply DropShadowFilter to container (not individual words) to avoid conflicts with OutlineFilter
    const shadowOpt = this.originalOpts.shadow;
    if (shadowOpt) {
      const offsetX = shadowOpt.offsetX ?? 0;
      const offsetY = shadowOpt.offsetY ?? 0;
      const shadowColor = parseColor(shadowOpt.color ?? "#000000");
      const shadowAlpha = shadowOpt.alpha ?? 1;
      const shadowBlur = shadowOpt.blur ?? 4;

      // The filter's internal render pass needs enough padding to fit the blurred shadow.
      // Without this, high blur values cause the shadow to be clipped at the filter boundary.
      // padding must be >= blur * 2 + the max offset so the blurred shadow is never cut off.
      const shadowFilterPadding = Math.ceil(
        shadowBlur * 2 + Math.max(Math.abs(offsetX), Math.abs(offsetY)),
      );

      if (shadowColor !== undefined) {
        if (this.dropShadowFilter) {
          this.dropShadowFilter.color = shadowColor;
          this.dropShadowFilter.alpha = shadowAlpha;
          this.dropShadowFilter.blur = shadowBlur;
          this.dropShadowFilter.offset = { x: offsetX, y: offsetY };
          // padding is a base Filter property — set after construction
          this.dropShadowFilter.padding = shadowFilterPadding;
        } else {
          this.dropShadowFilter = new DropShadowFilter({
            color: shadowColor,
            alpha: shadowAlpha,
            blur: shadowBlur,
            offset: { x: offsetX, y: offsetY },
          });
          // padding is a base Filter property — set after construction
          this.dropShadowFilter.padding = shadowFilterPadding;
        }

        this.pixiTextContainer.filters = [this.dropShadowFilter];
      }
    } else {
      // Remove shadow filter if no shadow
      if (this.dropShadowFilter) {
        this.pixiTextContainer.filters = [];
        this.dropShadowFilter = null;
      }
    }

    // 4. Calculate Layout (Lines) - mostly following CaptionClip logic
    const decoration = this.originalOpts.textDecoration || (this.originalOpts as any).verticalAlign;
    const lineHeightMultiplier = this.originalOpts.lineHeight ?? 1;
    const fontSize = style.fontSize ?? 40;
    const lineHeight = fontSize * lineHeightMultiplier;

    // Measure space width using the clip's ACTUAL font family.
    // styleBase.fontFamily is the Pixi bitmap cache key (e.g.
    // "installed_font_Roboto_40_normal_normal") which the browser Canvas 2D API
    // does not recognise — it falls back to Arial/system-ui.
    // Instead we use the original font family so the measurement reflects
    // the real font's advance width for a space character.
    const _spaceFs = this.originalOpts.fontSize || 40;
    const _spaceFamily = this.originalOpts.fontFamily || "Arial";
    const _spaceWeight = String(this.originalOpts.fontWeight || "normal");
    const _spaceStyle = this.originalOpts.fontStyle || "normal";
    const _fontSpec = `${_spaceStyle} ${_spaceWeight} ${_spaceFs}px "${_spaceFamily}"`;

    if (typeof document !== "undefined") {
      try {
        await document.fonts.load(_fontSpec);
      } catch (_) {
        /* ignore */
      }
    }

    const _spaceMeasureStyle = new TextStyle({
      fontFamily: _spaceFamily,
      fontSize: _spaceFs,
      fontWeight: _spaceWeight as TextStyle["fontWeight"],
      fontStyle: _spaceStyle as TextStyle["fontStyle"],
    });
    const metrics = CanvasTextMetrics.measureText(" ", _spaceMeasureStyle);

    // Measure the ACTUAL visual text height using canvas text metrics.
    // getLocalBounds().height for SplitBitmapText often includes font metrics padding
    // (ascent/descent space beyond visible glyphs), which causes inaccurate vertical centering.
    // CanvasTextMetrics.fontProperties gives the font-specific ascent + descent which is
    // closer to the actual visual text height than the bitmap font bounding box.
    const _textMeasureStyle = new TextStyle({
      fontFamily: _spaceFamily,
      fontSize: _spaceFs,
      fontWeight: _spaceWeight as TextStyle["fontWeight"],
      fontStyle: _spaceStyle as TextStyle["fontStyle"],
    });
    const textMeasureMetrics = CanvasTextMetrics.measureText("Hg", _textMeasureStyle);
    const fontProps = textMeasureMetrics.fontProperties;
    const measuredTextHeight =
      fontProps && fontProps.ascent > 0
        ? Math.ceil(fontProps.ascent + fontProps.descent)
        : fontSize;

    const tempSpace = new SplitBitmapText({
      text: " ",
      style: this.textStyleBase,
    });
    const spaceWidth = Math.ceil(
      tempSpace.getLocalBounds().width || tempSpace.width || metrics.width || _spaceFs * 0.25,
    );
    tempSpace.destroy();

    // Derive wrapWidth from the snapshotted _width captured before any await.
    // This prevents concurrent updateStyle() or width-setter calls from corrupting
    // the layout value after we resumed from document.fonts.ready.
    // Always apply padding for consistent text positioning.
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
    const lines: { words: SplitBitmapText[]; width: number; height: number }[] = [];
    let currentLine: SplitBitmapText[] = [];
    let currentLineWidth = 0;
    let currentLineHeight = 0;

    this.wordTexts.forEach((wordText) => {
      const bounds = wordText.getLocalBounds();
      const wordWidth = Math.ceil(bounds.width || wordText.width);
      const wordHeight = Math.ceil(bounds.height || wordText.height);

      const projectedWidth = currentLineWidth + (currentLineWidth > 0 ? spaceWidth : 0) + wordWidth;
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

    // Background line options (declared early so line-height and bounding-box logic can use them)
    const bgColorOpt = this.originalOpts.background?.color;
    const hasBg = !!bgColorOpt && bgColorOpt !== "transparent" && bgColorOpt !== "";
    const bgOpacity = this.originalOpts.background?.opacity ?? 1;
    const bgBorderRadius = this.originalOpts.background?.borderRadius ?? 4;
    // Always apply padding for consistent text positioning, regardless of background visibility
    const bgPadX = this.originalOpts.background?.paddingX ?? 8;
    const bgPadY = this.originalOpts.background?.paddingY ?? 4;

    // When background is enabled, expand each line's height by the vertical padding so the
    // background rect tightly wraps the actual rendered glyphs with `bgPadY` on each side.
    // We intentionally do NOT use measuredTextHeight here because CanvasTextMetrics returns
    // CSS font-line-height metrics (e.g. 101px) which can be significantly larger than the
    // actual bitmap-text bounding box height (e.g. 80px), inflating the bg rect unnecessarily.
    const bgLineHeight = measuredTextHeight + bgPadY * 2;
    lines.forEach((line) => {
      line.height = Math.max(line.height, bgLineHeight);
    });

    // 5. Dimension Calculation
    let maxLineWidth = 0;
    let totalHeight = 0;
    lines.forEach((line) => {
      maxLineWidth = Math.max(maxLineWidth, line.width);
      totalHeight += line.height;
    });

    const textWidth = maxLineWidth;
    const textHeight = totalHeight;

    let contentWidth = textWidth;
    if (snapshotWordWrap && snapshotWidth > 0) {
      // Expand to the inner text area (target minus bg padding on both sides) so that
      // after contentWidth += bgPadX * 2 below, containerWidth == snapshotWidth exactly.
      // Without this, the bounding box grows by bgPadX*2 every time a resize completes.
      // Always apply padding for consistent wrap calculation
      const snapshotBgPadX = snapshotBackground?.paddingX ?? 8;
      const innerTargetWidth = snapshotWidth - snapshotBgPadX * 2;
      contentWidth = Math.max(contentWidth, innerTargetWidth);
    } else if (snapshotWordWrap && snapshotWordWrapWidth != null && snapshotWordWrapWidth > 0) {
      contentWidth = Math.max(contentWidth, snapshotWordWrapWidth);
    }
    let contentHeight = textHeight;

    // Bounding box must include background horizontal padding so the bg rect
    // is fully enclosed within the clip's logical dimensions.
    contentWidth += bgPadX * 2;
    contentHeight = totalHeight; // already includes bg line height

    // Use _targetWidth (the resize target) rather than _width (which this function
    // itself overwrites with the measured output at the end, so it would give a
    // stale value on the _needsRefresh re-run).
    const effectiveWidth = snapshotWidth > 0 ? snapshotWidth : ((this as any)._width as number);
    const isAutoWidth = effectiveWidth === 0;
    const isAutoHeight = this.height === 0;

    const containerWidth = isAutoWidth ? contentWidth : Math.max(contentWidth, effectiveWidth);
    const containerHeight = isAutoHeight
      ? contentHeight
      : Math.max(contentHeight, this.height || 0);

    // 6. Positioning words within the container
    let startY = 0;
    const finalVAlign = (this.originalOpts as any).verticalAlign || "top";
    if (finalVAlign === "center") {
      startY = (containerHeight - contentHeight) / 2;
    } else if (finalVAlign === "bottom") {
      startY = containerHeight - contentHeight;
    }

    // Background line options (bg variables declared above)
    let currentY = startY;
    const graphics = new Graphics();
    const bgGraphics = hasBg ? new Graphics() : null;
    const lineRects: { x: number; y: number; w: number; h: number }[] = [];
    let hasDecoration = false;

    lines.forEach((line) => {
      let currentX = 0;
      const finalAlign = this.textAlign;
      if (finalAlign === "center") {
        currentX = (containerWidth - line.width) / 2;
      } else if (finalAlign === "right") {
        currentX = containerWidth - line.width - bgPadX * 2;
      } else {
        // Left-aligned: offset text by padding so content is inset consistently
        currentX = bgPadX;
      }

      const lineXStart = currentX;

      line.words.forEach((wordText, wordIndex) => {
        wordText.x = Math.round(currentX);
        // Vertically center word within the line height.
        // When bg is enabled, line.height = measuredTextHeight + bgPadY*2,
        // so text is automatically centered inside the background rect.

        wordText.y = Math.round(currentY + (line.height - measuredTextHeight) / 2 - 9);
        currentX +=
          (wordText.getLocalBounds().width || wordText.width) +
          (wordIndex < line.words.length - 1 ? spaceWidth : 0);
      });

      // Collect per-line background rectangle for TikTok-style continuous rounded path
      if (hasBg && bgGraphics) {
        lineRects.push({
          x: lineXStart - bgPadX,
          y: currentY,
          w: line.width + bgPadX * 2,
          h: line.height,
        });
      }

      // Handle Text Decoration
      if (
        decoration &&
        decoration !== "none" &&
        ["underline", "overline", "strikethrough", "line-through"].includes(decoration)
      ) {
        hasDecoration = true;
        const finalDecoration = decoration === "strikethrough" ? "line-through" : decoration;
        const lineThickness = Math.max(1, fontSize / 12);

        // Determine Line Color
        let lineColor = 0xffffff;
        if (typeof style.fill === "number") {
          lineColor = style.fill;
        } else if (style.fill && typeof style.fill === "object" && "fill" in style.fill) {
          lineColor = 0xffffff;
        }

        let yOffset = 0;
        if (finalDecoration === "underline") {
          yOffset = line.height;
        } else if (finalDecoration === "line-through") {
          yOffset = line.height / 2;
        } else if (finalDecoration === "overline") {
          yOffset = 0;
        }

        graphics.rect(lineXStart, currentY + yOffset, line.width, lineThickness);
        graphics.fill(lineColor);
      }

      currentY += line.height;
    });

    if (hasDecoration) {
      this.pixiTextContainer.addChild(graphics);
    }

    // Add background graphics behind text (TikTok-style continuous rounded path)
    if (bgGraphics && lineRects.length > 0) {
      const parsedBgColor = parseColor(bgColorOpt);
      this.drawRoundedTiktokPath(
        bgGraphics,
        lineRects,
        bgBorderRadius,
        parsedBgColor ?? 0x000000,
        bgOpacity,
      );
      this.pixiTextContainer.addChildAt(bgGraphics, 0);
    }

    // Add transparent padding around the texture so animation transforms (slide, zoom)
    // have room to move without hard-clipping at the clip boundary.
    // The clip bounding box / selection handles are unaffected — they use _width/_height
    // which remain the logical (unpadded) content dimensions.
    const ANIM_PAD = 300;
    // Add filter padding to prevent stroke from being cropped in the render texture
    const filterPadding = strokeWidth > 0 ? strokeWidth * 2.1 : 0;
    // Add shadow padding to prevent shadow blur from being cropped
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

    // Shift all content inside pixiTextContainer so it lands in the centre of the padded texture
    if (this.pixiTextContainer) {
      this.pixiTextContainer.x = totalPad;
      this.pixiTextContainer.y = totalPad;
    }

    // Reuse or resize render texture efficiently
    if (this.renderTexture) {
      this.renderTexture.destroy();
    }
    this.renderTexture = RenderTexture.create({
      width: paddedWidth,
      height: paddedHeight,
    });

    // Store the padding so PixiSpriteRenderer can compensate the sprite anchor offset
    this.renderTexturePadding = totalPad;

    // Update clip dimensions — these are the LOGICAL (unpadded) dimensions used for
    // selection handles, layout, and transforms. Do NOT use paddedWidth/Height here.
    this._meta.width = containerWidth;
    this._meta.height = containerHeight;

    (this as any)._width = containerWidth;
    (this as any)._height = containerHeight;

    if (this.duration === 0 && this._meta.duration !== Infinity) {
      this.duration = this._meta.duration;
      this.display.to = this.display.from + this.duration;
    }
  }

  /**
   * Helper to create PixiJS TextStyle options from Text options
   */
  private createStyleFromOpts(opts: ITextOpts): any {
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

    // Handle color - can be color or gradient
    const colorOpt = opts.color ?? "#ffffff";
    if (
      colorOpt &&
      typeof colorOpt === "object" &&
      "type" in colorOpt &&
      colorOpt.type === "gradient"
    ) {
      // Create gradient fill
      const gradient = new FillGradient(colorOpt.x0, colorOpt.y0, colorOpt.x1, colorOpt.y1);
      colorOpt.colors.forEach(({ ratio, color }) => {
        const colorNumber = typeof color === "number" ? color : (parseColor(color) ?? 0xffffff);
        gradient.addColorStop(ratio, colorNumber);
      });
      styleOptions.fill = { fill: gradient };
    } else {
      // Simple color fill
      const { color: fillColor, alpha: fillAlpha } = resolveColor(colorOpt as string);
      styleOptions.fill = fillColor;
      if (fillAlpha < 1) {
        styleOptions.fillAlpha = fillAlpha;
      }
    }

    // Handle stroke - using OutlineFilter instead of native PixiJS stroke
    // Native stroke is skipped here; filter is applied in refreshText()

    // Shadow is handled via DropShadowFilter on container, not TextStyle
    // This prevents bounding box issues with native TextStyle shadow

    return styleOptions;
  }

  /**
   * Draw a continuous rounded path around multiple line rectangles (TikTok-style caption background).
   * Aligns nearby edges, then traces the outer contour using arcTo for smooth rounded joins between lines.
   */
  private drawRoundedTiktokPath(
    graphics: Graphics,
    rects: { x: number; y: number; w: number; h: number }[],
    radius: number,
    color: number,
    alpha: number = 1,
  ) {
    if (rects.length === 0) return;

    // --- Align edges that are close to each other ---
    // The threshold must be at least 2 * radius, otherwise the two arcTo calls
    // for the inner and outer corners will overlap and cause rendering glitches.
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

    // Right side (top to bottom)
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

    // Left side (bottom to top)
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

    // Start at the midpoint between the last and first point so the first corner is rounded
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
    Log.info("Text destroy");

    // Destroy pixiTextContainer first (must be destroyed before app)
    try {
      if (this.pixiTextContainer != null) {
        if (!this.pixiTextContainer.destroyed) {
          this.pixiTextContainer.destroy({ children: true });
        }
      }
    } catch (err) {
      // Ignore errors during destroy
    } finally {
      this.pixiTextContainer = null;
    }

    // Destroy renderTexture (before app, as it may reference app's renderer)
    try {
      if (this.renderTexture != null) {
        const anyTexture = this.renderTexture as any;
        // Only destroy if not already destroyed
        if (anyTexture.destroyed !== true) {
          this.renderTexture.destroy(true);
        }
      }
    } catch (err) {
      // Ignore errors during destroy
      // Swallow error to prevent crashes during cleanup
    } finally {
      this.renderTexture = null;
    }

    // Clear external renderer reference (we don't own it, so we don't destroy it)
    this.externalRenderer = null;

    // Destroy fallback Pixi App if we created one
    if (this.pixiApp != null) {
      try {
        const anyApp = this.pixiApp as any;
        if (anyApp.destroyed !== true && anyApp.renderer != null) {
          this.pixiApp.destroy(true, {
            children: true,
            texture: true,
          });
        }
      } catch (err) {
        // Ignore errors during destroy
      } finally {
        this.pixiApp = null;
      }
    }

    super.destroy();
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
