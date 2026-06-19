import { getEasing } from "./easings";
import { AnimationOptions, AnimationTransform, IAnimation, MaskTransform } from "./types";

/**
 * Direction the wipe edge travels FROM:
 *   "left"   → wipe sweeps left-to-right  (mask grows from left)
 *   "right"  → wipe sweeps right-to-left  (mask grows from right)
 *   "top"    → wipe sweeps top-to-bottom  (mask grows from top)
 *   "bottom" → wipe sweeps bottom-to-top  (mask grows from bottom)
 */
export type WipeDirection = "left" | "right" | "top" | "bottom";

/**
 * "reveal" = wipe IN  (mask expands, more of the clip becomes visible)
 * "conceal"= wipe OUT (mask shrinks, clip disappears progressively)
 */
export type WipeMode = "reveal" | "conceal";

export interface WipeAnimationParams {
  direction: WipeDirection;
  mode: WipeMode;
  /** Optional angle offset for diagonal wipes (degrees) */
  angle?: number;
  /** Soft edge feather width in pixels. 0 = hard edge. */
  feather?: number;
}

/**
 * WipeAnimation
 *
 * Rectangular edge-sweep mask animation. Emits a MaskTransform via
 * getTransform() so it composes cleanly with other animations.
 * The actual mask drawing is handled by PixiSpriteRenderer's unified
 * mask compositor, which reads renderTransform.mask each frame.
 *
 * Example (AI usage):
 *
 * ```ts
 * clip.addAnimation("wipe", {
 *   duration: 1_000_000, // 1 second in microseconds
 *   easing: "easeInOutCubic",
 * }, {
 *   direction: "left",
 *   mode: "reveal",
 *   feather: 0,        // hard edge (default)
 * });
 * ```
 */
export class WipeAnimation implements IAnimation {
  readonly id: string;
  readonly type = "wipe";
  readonly options: Required<AnimationOptions>;
  readonly params: WipeAnimationParams;

  constructor(params: WipeAnimationParams, options: AnimationOptions) {
    this.id = options.id || `wipe_${Math.random().toString(36).substr(2, 9)}`;
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
    const { direction, mode, angle, feather } = this.params;

    const offsetTime = time - delay;

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

    const mask: MaskTransform = {
      shape: "rect",
      progress: mode === "reveal" ? progress : 1 - progress,
      direction,
      angle: angle ?? 0,
      feather: feather ?? 0,
    };

    return { mask };
  }
}
