import { Graphics, RenderTexture, type Application } from "pixi.js";
import { BaseClip } from "./base-clip";
import { nanoid } from "nanoid";
import type { ShapeType, IShapeStyle } from "@openvideo/core";
import type { IClipMeta } from "./iclip";

export interface ShapeClipOptions {
  shapeType: ShapeType;
  width?: number;
  height?: number;
  fill?: string;
  fillOpacity?: number;
  stroke?: {
    color: string;
    width: number;
  };
  borderRadius?: number;
  renderer?: Application["renderer"];
}

/**
 * ShapeClip renders rectangle shapes using Pixi.js Graphics
 */
export class ShapeClip extends BaseClip {
  readonly type = "Shape";

  public shapeType: ShapeType;
  public graphics: Graphics;
  private _meta: IClipMeta;
  private renderTexture: RenderTexture | null = null;
  private externalRenderer: Application["renderer"] | null = null;

  constructor(options: ShapeClipOptions) {
    super();
    this.shapeType = options.shapeType;
    this.id = nanoid();
    this.name = `${options.shapeType} Shape`;
    this.src = `shape://${options.shapeType}`;

    // Store external renderer if provided
    this.externalRenderer = options.renderer ?? null;

    // Set dimensions
    this.width = options.width ?? 200;
    this.height = options.height ?? 200;

    // Initialize graphics
    this.graphics = new Graphics();

    // Set meta
    this._meta = {
      width: this.width,
      height: this.height,
      duration: 0, // Shapes have no duration by default
    };

    // Set style from options
    this.style = {
      fill: options.fill ?? "#3b82f6",
      fillOpacity: options.fillOpacity ?? 1,
      stroke: options.stroke ?? { color: "#1e40af", width: 2 },
      borderRadius: options.borderRadius ?? 0,
    };

    // Set ready promise - doesn't need renderer yet
    this.ready = Promise.resolve(this._meta);
  }

  private async getRenderer(): Promise<Application["renderer"]> {
    if (this.externalRenderer != null) return this.externalRenderer;
    throw new Error(
      "ShapeClip: No renderer available. Provide a renderer via options.renderer or setRenderer().",
    );
  }

  /**
   * Set an external renderer (e.g., from Studio)
   */
  setRenderer(renderer: Application["renderer"]): void {
    this.externalRenderer = renderer;
  }

  /**
   * Get or create the render texture for this shape
   */
  private async getRenderTexture(): Promise<RenderTexture> {
    if (this.renderTexture == null) {
      this.renderTexture = RenderTexture.create({
        width: Math.ceil(this.width),
        height: Math.ceil(this.height),
      });
    }
    // Resize if dimensions changed
    if (
      this.renderTexture.width !== Math.ceil(this.width) ||
      this.renderTexture.height !== Math.ceil(this.height)
    ) {
      this.renderTexture.resize(Math.ceil(this.width), Math.ceil(this.height));
    }
    return this.renderTexture;
  }

  get meta(): IClipMeta {
    return this._meta;
  }

  private drawShape(): void {
    const style = this.style as IShapeStyle;

    this.graphics.clear();

    // Draw rectangle (only shape type supported)
    this.drawRectangle(style);

    // Fill and stroke the path (Pixi v8: fill/stroke after drawing)
    if (style.fill) {
      const fillColor = this.hexToNumber(style.fill);
      this.graphics.fill({
        color: fillColor,
        alpha: style.fillOpacity ?? 1,
      });
    }

    if (style.stroke) {
      const strokeColor = this.hexToNumber(style.stroke.color);
      this.graphics.stroke({
        color: strokeColor,
        width: style.stroke.width,
        alpha: 1,
      });
    }
  }

  private drawRectangle(style: IShapeStyle): void {
    const borderRadius = style.borderRadius ?? 0;
    if (borderRadius > 0) {
      this.graphics.roundRect(
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height,
        borderRadius,
      );
    } else {
      this.graphics.rect(-this.width / 2, -this.height / 2, this.width, this.height);
    }
  }

  private hexToNumber(hex: string): number {
    const hexStr = hex.startsWith("#") ? hex.slice(1) : hex;
    return parseInt(hexStr, 16);
  }

  async tick(_time: number): Promise<{
    video: ImageBitmap;
    state: "success";
  }> {
    await this.ready;

    // Get or create render texture (requires renderer to be set)
    const renderTexture = await this.getRenderTexture();

    // Ensure shape is drawn (drawShape clears and redraws)
    this.drawShape();

    // Render graphics to render texture
    const renderer = await this.getRenderer();

    // Position graphics to center in the render texture
    this.graphics.x = this.width / 2;
    this.graphics.y = this.height / 2;

    renderer.render({
      container: this.graphics,
      target: renderTexture,
    });

    // Extract ImageBitmap from render texture
    const source = renderTexture.source?.resource?.source;
    let imageBitmap: ImageBitmap;
    if (source instanceof HTMLCanvasElement || source instanceof OffscreenCanvas) {
      imageBitmap = await createImageBitmap(source);
    } else {
      // Fallback: extract canvas
      const extract = renderer.extract;
      const extractedCanvas = extract.canvas(renderTexture);
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

  async clone(): Promise<this> {
    const cloned = new ShapeClip({
      shapeType: this.shapeType,
      width: this.width,
      height: this.height,
      fill: (this.style as any).fill,
      fillOpacity: (this.style as any).fillOpacity,
      stroke: (this.style as any).stroke,
      borderRadius: (this.style as any).borderRadius,
    }) as this;

    // Copy transform properties
    cloned.left = this.left;
    cloned.top = this.top;
    cloned.angle = this.angle;
    cloned.opacity = this.opacity;
    cloned.zIndex = this.zIndex;

    // Copy timing properties (needed for compositor export)
    cloned.display = { ...this.display };
    cloned.duration = this.duration;
    cloned.timing = { ...this.timing };

    return cloned;
  }

  async split(_time: number): Promise<[this, this]> {
    // For shapes, splitting creates two identical shapes
    const first = await this.clone();
    const second = await this.clone();

    return [first, second];
  }

  toJSON(main: boolean = false): any {
    const baseJSON = super.toJSON(main);
    return {
      ...baseJSON,
      shapeType: this.shapeType,
    };
  }

  // Override style setter to redraw shape when style changes
  set style(style: any) {
    super.style = style;
    if (this.graphics) {
      this.drawShape();
    }
  }

  get style(): any {
    return super.style;
  }

  // Override dimension setters to redraw shape and resize texture
  set width(width: number) {
    super.width = width;
    if (this.graphics) {
      this.drawShape();
    }
    if (this.renderTexture) {
      this.renderTexture.resize(Math.ceil(this.width), Math.ceil(this.height));
    }
  }

  get width(): number {
    return super.width;
  }

  set height(height: number) {
    super.height = height;
    if (this.graphics) {
      this.drawShape();
    }
    if (this.renderTexture) {
      this.renderTexture.resize(Math.ceil(this.width), Math.ceil(this.height));
    }
  }

  get height(): number {
    return super.height;
  }

  /**
   * Create ShapeClip from JSON object
   */
  static async fromObject(json: any): Promise<ShapeClip> {
    const shape = new ShapeClip({
      shapeType: json.shapeType,
      width: json.transform?.width,
      height: json.transform?.height,
      fill: json.style?.fill,
      fillOpacity: json.style?.fillOpacity,
      stroke: json.style?.stroke,
      borderRadius: json.style?.borderRadius,
    });

    BaseClip.deserializeBaseProperties(shape, json);

    return shape;
  }
}
