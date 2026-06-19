import { Graphics } from "pixi.js";
import { getEasing } from "./easings";
import { AnimationOptions, AnimationTransform, IAnimation } from "./types";

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
}

/**
 * WipeAnimation
 *
 * Applies a rectangular mask that grows/shrinks over time to create a
 * wipe-in or wipe-out transition for any clip type.
 *
 * The mask is applied to the clip's animationContainer via the
 * PixiSpriteRenderer which calls `anim.apply(animationContainer, time)`.
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

  /**
   * WipeAnimation does not contribute standard transform offsets;
   * all visual work is done inside apply() on the Pixi container.
   */
  getTransform(_time: number): AnimationTransform {
    return {};
  }

  /**
   * Apply the wipe mask to the PixiJS animationContainer.
   *
   * @param target  The PixiJS Container (animationContainer from PixiSpriteRenderer)
   * @param time    Relative time in microseconds (from clip start)
   */
  apply(target: any, time: number): void {
    if (!target) return;

    const { duration, delay, easing, iterCount } = this.options;
    const { direction, mode } = this.params;

    const offsetTime = time - delay;

    // Before the animation starts — set mask to fully hidden (conceal) or no mask (reveal)
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

    // Wipe progress: for "reveal" 0=nothing visible → 1=fully visible
    //               for "conceal" 0=fully visible → 1=nothing visible
    const wipeProgress = mode === "reveal" ? progress : 1 - progress;

    // We need the clip's logical dimensions. The animationContainer's parent is the
    // root Container whose renderTexturePadding we can read. Alternatively we try to
    // measure from the pixiSprite child (first Sprite child of the animationContainer).
    const dims = this._getTargetDimensions(target);
    if (dims.width <= 0 || dims.height <= 0) return;

    const { width, height } = dims;

    // Calculate the visible rect depending on direction
    let rx = -width / 2;
    let ry = -height / 2;
    let rw = width;
    let rh = height;

    switch (direction) {
      case "left":
        rw = width * wipeProgress;
        rx = -width / 2;
        break;
      case "right":
        rw = width * wipeProgress;
        rx = width / 2 - rw;
        break;
      case "top":
        rh = height * wipeProgress;
        ry = -height / 2;
        break;
      case "bottom":
        rh = height * wipeProgress;
        ry = height / 2 - rh;
        break;
    }

    // Fully visible — remove mask to avoid unnecessary overdraw
    if (wipeProgress >= 1) {
      target.mask = null;
      const existingGraphics = (target as any).__wipeMask;
      if (existingGraphics) existingGraphics.visible = false;
      return;
    }

    // Fully hidden — zero-size mask (hide the clip completely)
    if (wipeProgress <= 0) {
      rw = 0;
      rh = 0;
    }

    // Create or reuse the wipe mask Graphics object
    let wipeGraphics = (target as any).__wipeMask;
    if (!wipeGraphics) {
      wipeGraphics = new Graphics();
      wipeGraphics.label = "WipeMask";
      (wipeGraphics as any).__wipe = true;
      (target as any).__wipeMask = wipeGraphics;
      // Graphics masks in Pixi v8 must be in the display list for stencil masking.
      // Add as a child so transforms align automatically.
      target.addChild(wipeGraphics);
    }
    wipeGraphics.visible = true;

    wipeGraphics.clear();
    if (rw > 0 && rh > 0) {
      wipeGraphics.rect(rx, ry, rw, rh).fill({ color: 0xffffff });
    }

    target.mask = wipeGraphics;
  }

  /**
   * Derive the clip's logical width/height from the animationContainer.
   * Tries multiple strategies so it works for all clip types.
   */
  private _getTargetDimensions(target: any): { width: number; height: number } {
    // renderTexturePadding is stored on the root (parent of animationContainer) by PixiSpriteRenderer.
    // Text/Caption clips bake this extra padding into their render texture so slide animations
    // have room to move. We must subtract it to get the true visible clip dimensions.
    const parent = target.parent as any;
    const pad: number = parent?.renderTexturePadding ?? 0;

    if (target.children) {
      // 1. Walk direct children looking for MainSprite (works for all clip types)
      for (const child of target.children) {
        if (!child) continue;
        if (child.label === "MainSprite") {
          const tw = Math.abs((child as any).width ?? 0) - pad * 2;
          const th = Math.abs((child as any).height ?? 0) - pad * 2;
          if (tw > 0 && th > 0) return { width: tw, height: th };
        }
        // 2. Also check one level deeper (MirrorContainer wraps MainSprite)
        if (child.children) {
          for (const grandchild of child.children) {
            if (grandchild && grandchild.label === "MainSprite") {
              const tw = Math.abs((grandchild as any).width ?? 0) - pad * 2;
              const th = Math.abs((grandchild as any).height ?? 0) - pad * 2;
              if (tw > 0 && th > 0) return { width: tw, height: th };
            }
          }
        }
      }
    }

    // 3. Fallback: getLocalBounds minus padding
    try {
      const lb = target.getLocalBounds();
      if (lb.width > 0 && lb.height > 0) {
        return { width: lb.width - pad * 2, height: lb.height - pad * 2 };
      }
    } catch {
      // may throw before first render
    }

    return { width: 0, height: 0 };
  }
}
