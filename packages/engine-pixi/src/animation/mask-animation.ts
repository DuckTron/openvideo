import { getEasing } from "./easings";
import {
  AnimationOptions,
  AnimationTransform,
  IAnimation,
  MaskPainter,
  MaskTransform,
} from "./types";

/**
 * Base class for all mask animations.
 * Subclasses override `buildMask(progress)` to define the mask shape.
 */
abstract class BaseMaskAnimation implements IAnimation {
  readonly id: string;
  abstract readonly type: string;
  readonly options: Required<AnimationOptions>;
  readonly params: any;

  constructor(params: any, options: AnimationOptions) {
    this.id = options.id || `mask_${Math.random().toString(36).substr(2, 9)}`;
    this.params = params;
    this.options = {
      duration: options.duration,
      delay: options.delay ?? 0,
      easing: options.easing ?? "linear",
      iterCount: options.iterCount ?? 1,
      id: this.id,
      disableGlobalEasing: options.disableGlobalEasing ?? false,
    };
  }

  getTransform(time: number): AnimationTransform {
    const { duration, delay, easing, iterCount } = this.options;
    const offsetTime = time - delay;

    const isReveal = this.params.mode !== "conceal";
    const isFinished = iterCount !== Infinity && offsetTime >= duration;

    if (isReveal && isFinished) {
      return {};
    }
    if (!isReveal && offsetTime < 0) {
      return {};
    }

    let rawProgress: number;
    if (offsetTime < 0) {
      rawProgress = 0;
    } else if (iterCount !== Infinity && offsetTime >= duration) {
      rawProgress = 1;
    } else {
      const cycleDuration = iterCount === Infinity ? duration : duration / iterCount;
      rawProgress = (offsetTime % cycleDuration) / cycleDuration;
    }

    const easingFn = getEasing(easing);
    const progress = easingFn(rawProgress);
    const finalProgress = this.params.mode === "conceal" ? 1 - progress : progress;

    const mask = this.buildMask(finalProgress);
    // Propagate initialProgress from params so the renderer can remap
    if (this.params.initialProgress != null) {
      mask.initialProgress = this.params.initialProgress as number;
    }
    return { mask };
  }

  protected abstract buildMask(progress: number): MaskTransform;
}

// ─── CircleReveal ────────────────────────────────────────────────────────────

export interface CircleRevealParams {
  mode?: "reveal" | "conceal";
  /** Origin of expansion. Default: "center" */
  origin?: MaskTransform["origin"];
  /** Feather (soft edge) in pixels */
  feather?: number;
}

/**
 * CircleReveal / CircleConceal
 *
 * An ellipse mask that expands from an origin point outward (or contracts inward).
 * Works on any clip type.
 *
 * ```ts
 * clip.addAnimation("circleReveal", { duration: 1_000_000, easing: "easeOutCubic" }, {
 *   mode: "reveal",
 *   origin: "center",
 *   feather: 10,
 * });
 * ```
 */
export class CircleRevealAnimation extends BaseMaskAnimation {
  readonly type = "circleReveal";

  constructor(params: CircleRevealParams, options: AnimationOptions) {
    super(params, options);
  }

  protected buildMask(progress: number): MaskTransform {
    return {
      shape: "circle",
      progress,
      origin: this.params.origin ?? "center",
      feather: this.params.feather ?? 0,
    };
  }
}

// ─── RectExpand ──────────────────────────────────────────────────────────────

export interface RectExpandParams {
  mode?: "reveal" | "conceal";
  /** Origin of expansion. Default: "center" */
  origin?: MaskTransform["origin"];
  /** Feather in pixels */
  feather?: number;
}

/**
 * RectExpand / RectShrink
 *
 * A rectangle mask that grows outward from an origin (or shrinks inward).
 * Useful for "iris box" style reveals.
 *
 * ```ts
 * clip.addAnimation("rectExpand", { duration: 1_000_000, easing: "easeInOutQuad" }, {
 *   mode: "reveal",
 *   origin: "center",
 * });
 * ```
 */
export class RectExpandAnimation extends BaseMaskAnimation {
  readonly type = "rectExpand";

  constructor(params: RectExpandParams, options: AnimationOptions) {
    super(params, options);
  }

  protected buildMask(progress: number): MaskTransform {
    const origin = this.params.origin ?? "center";

    const painter: MaskPainter = (g, width, height, p) => {
      // Determine origin point in local space (centered at 0,0)
      let ox = 0;
      let oy = 0;
      switch (origin) {
        case "topLeft":
          ox = -width / 2;
          oy = -height / 2;
          break;
        case "topRight":
          ox = width / 2;
          oy = -height / 2;
          break;
        case "bottomLeft":
          ox = -width / 2;
          oy = height / 2;
          break;
        case "bottomRight":
          ox = width / 2;
          oy = height / 2;
          break;
        default:
          ox = 0;
          oy = 0; // center
      }

      // Expand rect symmetrically from origin, clamped to clip bounds
      const halfW = (width / 2) * p;
      const halfH = (height / 2) * p;
      const rx = Math.max(-width / 2, ox - halfW);
      const ry = Math.max(-height / 2, oy - halfH);
      const rw = Math.min(width, halfW * 2);
      const rh = Math.min(height, halfH * 2);

      if (rw > 0 && rh > 0) {
        g.rect(rx, ry, rw, rh).fill({ color: 0xffffff });
      }
    };

    return { shape: "custom", progress, painter };
  }
}

// ─── CenterExpand ────────────────────────────────────────────────────────────

export interface CenterExpandParams {
  mode?: "reveal" | "conceal";
  /**
   * Axis of expansion:
   *   "vertical"   → starts full-width, expands top + bottom (default)
   *   "horizontal" → starts full-height, expands left + right
   *   "both"       → expands in all directions simultaneously (true center iris)
   */
  axis?: "vertical" | "horizontal" | "both";
}

/**
 * CenterExpand
 *
 * Reveals the clip from the center outward.
 * Default: starts as a full-width zero-height bar, expands up and down.
 *
 * ```ts
 * clip.addAnimation("centerExpand", { duration: 1_000_000, easing: "easeOutCubic" }, {
 *   mode: "reveal",
 *   axis: "vertical",
 * });
 * ```
 */
export class CenterExpandAnimation extends BaseMaskAnimation {
  readonly type = "centerExpand";

  constructor(params: CenterExpandParams, options: AnimationOptions) {
    super(params, options);
  }

  protected buildMask(progress: number): MaskTransform {
    const axis = this.params.axis ?? "vertical";

    const painter: MaskPainter = (g, width, height, p) => {
      let rw: number;
      let rh: number;

      switch (axis) {
        case "horizontal":
          rw = width * p;
          rh = height;
          break;
        case "both":
          rw = width * p;
          rh = height * p;
          break;
        default: // "vertical"
          rw = width;
          rh = height * p;
          break;
      }

      g.rect(-rw / 2, -rh / 2, rw, rh).fill({ color: 0xffffff });
    };

    return { shape: "custom", progress, painter };
  }
}

// ─── AngleWipe ───────────────────────────────────────────────────────────────

export interface AngleWipeParams {
  mode?: "reveal" | "conceal";
  /** Wipe angle in degrees. 0 = left→right, 90 = top→bottom, 45 = diagonal */
  angle?: number;
  /** Feather in pixels */
  feather?: number;
}

/**
 * AngleWipe
 *
 * A wipe that sweeps at an arbitrary angle (diagonal, rotated, etc.).
 * The `angle` param rotates the sweep direction from the default left→right.
 *
 * ```ts
 * clip.addAnimation("angleWipe", { duration: 1_000_000, easing: "linear" }, {
 *   mode: "reveal",
 *   angle: 45, // diagonal
 * });
 * ```
 */
export class AngleWipeAnimation extends BaseMaskAnimation {
  readonly type = "angleWipe";

  constructor(params: AngleWipeParams, options: AnimationOptions) {
    super(params, options);
  }

  protected buildMask(progress: number): MaskTransform {
    return {
      shape: "rect",
      progress,
      direction: "left",
      angle: this.params.angle ?? 0,
      feather: this.params.feather ?? 0,
    };
  }
}

// ─── StarReveal ──────────────────────────────────────────────────────────────

export interface StarRevealParams {
  mode?: "reveal" | "conceal";
  /** Number of star points. Default: 5 */
  points?: number;
  /** Inner radius ratio relative to outer (0–1). Default: 0.4 */
  innerRatio?: number;
}

/**
 * StarReveal
 *
 * Reveals the clip through a star-shaped mask that grows from the center.
 * Demonstrates the custom `painter` pattern — no renderer changes needed.
 *
 * ```ts
 * clip.addAnimation("starReveal", { duration: 1_000_000, easing: "easeOutBack" }, {
 *   mode: "reveal",
 *   points: 5,
 *   innerRatio: 0.4,
 * });
 * ```
 */
export class StarRevealAnimation extends BaseMaskAnimation {
  readonly type = "starReveal";

  constructor(params: StarRevealParams, options: AnimationOptions) {
    super(params, options);
  }

  protected buildMask(progress: number): MaskTransform {
    const { points = 5, innerRatio = 0.4 } = this.params as StarRevealParams;

    const painter: MaskPainter = (g, width, height, p) => {
      const maxR = Math.hypot(width, height) / 2;
      const outerR = maxR * p;
      const innerR = outerR * innerRatio;
      const cx = 0;
      const cy = 0;
      const totalPoints = points * 2;
      const coords: number[] = [];

      for (let i = 0; i < totalPoints; i++) {
        const angle = (Math.PI / points) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        coords.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      }

      g.poly(coords, true).fill({ color: 0xffffff });
    };

    return { shape: "custom", progress, painter };
  }
}
