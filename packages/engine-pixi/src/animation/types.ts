export type EasingFunction = (t: number) => number;

export interface AnimationProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  angle?: number;
  blur?: number;
  brightness?: number;
  mirror?: number;
  motionBlur?: number;
}

export interface AnimationOptions {
  duration: number; // in microseconds
  delay?: number; // in microseconds
  easing?: string | EasingFunction;
  iterCount?: number;
  id?: string;
  disableGlobalEasing?: boolean;
}

export interface IAnimation {
  readonly id: string;
  readonly type: string;
  readonly options: Required<AnimationOptions>;
  readonly params?: any;

  /**
   * Calculate offsets and multipliers for the given time
   * @param time Relative time from the start of the clip in microseconds
   * @returns Partial state containing offsets/multipliers
   */
  getTransform(time: number): AnimationTransform;

  /**
   * Apply complex animations (like GSAP character animations) directly to a target
   * @param target The target object (e.g., PixiJS Container)
   * @param time Relative time in microseconds
   */
  apply?(target: any, time: number): void;
}

export interface AnimationTransform {
  x?: number; // additive offset
  y?: number; // additive offset
  width?: number; // additive offset
  height?: number; // additive offset
  scale?: number; // multiplier (relative to 1.0)
  scaleX?: number; // multiplier (relative to 1.0)
  scaleY?: number; // multiplier (relative to 1.0)
  opacity?: number; // multiplier (relative to 1.0)
  angle?: number; // additive offset
  blur?: number; // additive offset
  brightness?: number; // multiplier (relative to 1.0)
  mirror?: number; // 0 or 1 (boolean via number)
  motionBlur?: number; // additive offset
  // ─── Mask fields ─────────────────────────────────────────────────────────
  mask?: MaskTransform;
}

/**
 * Custom mask painter function.
 * Called by PixiSpriteRenderer when shape === "custom".
 * Receives a cleared Graphics object; draw your shape into it using Pixi's
 * Graphics API. Fill with white (0xffffff) — alpha determines mask opacity.
 *
 * @param g        The cleared Graphics object to draw into
 * @param width    Clip's logical width in pixels
 * @param height   Clip's logical height in pixels
 * @param progress Normalized reveal progress 0→1
 */
export type MaskPainter = (
  g: { rect: any; circle: any; ellipse: any; fill: any; poly: any; [key: string]: any },
  width: number,
  height: number,
  progress: number,
) => void;

export interface MaskTransform {
  /** Mask shape. Use "custom" and provide a `painter` for arbitrary paths. */
  shape: "rect" | "circle" | "ellipse" | "custom";
  /**
   * Normalized progress 0–1 controlling how much of the clip is revealed.
   * 0 = fully hidden, 1 = fully visible.
   */
  progress: number;
  /** For rect: which edge the wipe sweeps from. For circle/ellipse: ignored. */
  direction?: "left" | "right" | "top" | "bottom";
  /** For angled wipe: rotation of the mask edge in degrees (0 = vertical sweep) */
  angle?: number;
  /** Origin point for expand masks (circle/ellipse/rectExpand). Default: "center" */
  origin?: "center" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  /** Soft edge width in pixels. 0 = hard edge. */
  feather?: number;
  /**
   * Normalized starting size of the mask (0–1). Default: 0.
   * e.g. 0.2 means the mask starts at 20% size and grows to 100%.
   * The painter receives a `progress` value already remapped from
   * initialProgress→1 so individual painters don't need to handle this.
   */
  initialProgress?: number;
  /**
   * Custom painter for shape === "custom".
   * Draw any path into the provided Graphics object.
   * The renderer calls this instead of its built-in shape dispatch.
   */
  painter?: MaskPainter;
}

export interface KeyframeData {
  [key: string]: Partial<AnimationProps & { easing?: string | EasingFunction }>;
}

export const ANIMATABLE_PROPERTIES = {
  x: { label: "X Position", min: -2000, max: 2000, step: 1, default: 0 },
  y: { label: "Y Position", min: -2000, max: 2000, step: 1, default: 0 },
  width: { label: "Width", min: -1000, max: 1000, step: 1, default: 0 },
  height: { label: "Height", min: -1000, max: 1000, step: 1, default: 0 },
  scale: { label: "Scale", min: 0, max: 3, step: 0.1, default: 1 },
  scaleX: { label: "Scale X", min: 0, max: 3, step: 0.1, default: 1 },
  scaleY: { label: "Scale Y", min: 0, max: 3, step: 0.1, default: 1 },
  opacity: { label: "Opacity", min: 0, max: 1, step: 0.01, default: 1 },
  angle: { label: "Rotation", min: -360, max: 360, step: 1, default: 0 },
  blur: { label: "Blur", min: 0, max: 100, step: 1, default: 0 },
  brightness: { label: "Brightness", min: 0, max: 5, step: 0.1, default: 1 },
  mirror: { label: "Mirror", min: 0, max: 1, step: 1, default: 0 },
  motionBlur: { label: "Motion Blur", min: 0, max: 500, step: 1, default: 0 },
} as const;
