import gsap from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";
import { AnimationOptions, AnimationTransform, IAnimation } from "./types";
import { prepareVars, resolveVars, getAnimatedKeys, getPixiProperty } from "./pixi-animation-utils";

// Register PixiPlugin to support skewX, skewY, and other PixiJS properties
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

export interface GsapAnimationParams {
  /**
   * Animation presets or custom GSAP vars
   */
  type: "character" | "word" | "line";
  from: gsap.TweenVars;
  to: gsap.TweenVars;
  stagger?: number | gsap.StaggerVars;
}

export class GsapAnimation implements IAnimation {
  readonly id: string;
  readonly type: string;
  readonly options: Required<AnimationOptions>;
  readonly params: GsapAnimationParams;

  private timeline: gsap.core.Timeline | null = null;
  private lastTarget: any = null;
  private originalProperties = new Map<any, Record<string, any>>();

  constructor(params: GsapAnimationParams, options: AnimationOptions, type: string = "gsap") {
    this.id = options.id || `gsap_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.params = params;
    this.options = {
      duration: options.duration,
      delay: options.delay ?? 0,
      easing: options.easing ?? "none",
      iterCount: options.iterCount ?? 1,
      id: this.id,
      disableGlobalEasing: options.disableGlobalEasing ?? false,
    };
  }

  getTransform(_time: number): AnimationTransform {
    // GSAP animations usually handle properties directly on children,
    // so the base transform is empty.
    return {};
  }

  get isOutAnimation(): boolean {
    return (
      (this.options as any).mode === "out" ||
      (this.params as any).metaMode === "out" ||
      (this.params as any).mode === "out" ||
      this.id.toLowerCase().includes("out")
    );
  }

  restoreOriginals(): void {
    this.originalProperties.forEach((orig, t) => {
      if (t && !t.destroyed) {
        try {
          const pixiOrig = prepareVars(orig);
          gsap.set(t, pixiOrig);
          delete t.__ovAnchorAdjusted;
        } catch (e) {
          // ignore
        }
      }
    });
  }

  public getTargetCount(target: any): number {
    return this.getCurrentTargets(target).length;
  }

  apply(target: any, time: number): void {
    const { duration, delay } = this.options;
    const offsetTime = time - delay;

    // Check if we need to re-initialize the timeline
    let needsReinit =
      this.lastTarget !== target || !this.timeline || this.originalProperties.size === 0;

    // Get current actual targets from the container for comparison
    const currentActualTargets = this.getCurrentTargets(target);

    if (!needsReinit) {
      if (this.originalProperties.size !== currentActualTargets.length) {
        needsReinit = true;
      } else {
        // Check if target references have changed or any target is destroyed
        for (const t of currentActualTargets) {
          if (!this.originalProperties.has(t) || t.destroyed || !t.parent) {
            needsReinit = true;
            break;
          }
          // If a target now has a valid size but we haven't adjusted its anchor yet, we must re-initialize
          const hasAnchor = !!t.anchor;
          const hasPivot = !t.anchor && t.pivot && t.getLocalBounds;
          if (hasAnchor && !t.__ovAnchorAdjusted && t.width > 0 && t.height > 0) {
            needsReinit = true;
            break;
          }
          if (hasPivot && !t.__ovAnchorAdjusted) {
            const bounds = t.getLocalBounds();
            if (bounds.width > 0 && bounds.height > 0) {
              needsReinit = true;
              break;
            }
          }
        }
      }
    }

    if (needsReinit) {
      this.initTimeline(target);
      this.lastTarget = target;
    }

    if (!this.timeline) return;

    // Handle iteration and clamping
    const cycleDuration =
      this.options.iterCount === Infinity ? duration : duration / this.options.iterCount;

    let progress: number;
    if (this.options.iterCount !== Infinity && offsetTime >= duration) {
      progress = 1;
    } else if (offsetTime < 0) {
      if (this.isOutAnimation) {
        return; // exit animations do not apply anything before their start time
      }
      progress = 0;
    } else {
      progress = (offsetTime % cycleDuration) / cycleDuration;
    }

    this.timeline.progress(progress);

    // Apply manual boundary values for staggered elements to prevent GSAP revert issues
    const timelineTime = progress * this.timeline.duration();
    const animTargets = this.getCurrentTargets(target);
    const durationInSeconds = duration / 1e6;
    const { from, to, stagger } = this.params;
    const staggerVal = typeof stagger === "number" ? stagger : 0;

    animTargets.forEach((t, i) => {
      const tStart = i * staggerVal;
      const tEnd = tStart + durationInSeconds;

      const isOut = this.isOutAnimation;
      if (timelineTime < tStart) {
        // Force the starting values
        const orig = this.originalProperties.get(t) || {};
        const { resolvedFrom } = resolveVars(from, to, orig, isOut);
        const pixiFrom = prepareVars(resolvedFrom);
        gsap.set(t, pixiFrom);
      } else if (timelineTime > tEnd) {
        // Force the ending values
        const orig = this.originalProperties.get(t) || {};
        const { resolvedTo } = resolveVars(from, to, orig, isOut);
        const pixiTo = prepareVars(resolvedTo);
        gsap.set(t, pixiTo);
      }
    });
  }

  /**
   * Get current animation targets from the container based on animation type.
   * Used to compare against GSAP's cached targets to detect when children are recreated.
   */
  private getCurrentTargets(target: any): any[] {
    if (!target) {
      return [];
    }

    const { type } = this.params;

    // For Text and Caption clips, the words and characters live inside the TextOnlyContainer child if it exists.
    let textContainer = target;
    if (target.children) {
      const found = target.children.find((child: any) => child.label === "TextOnlyContainer");
      if (found) {
        textContainer = found;
      }
    }

    if (type === "character" || type === "word") {
      if (!textContainer || !textContainer.children || textContainer.children.length === 0) {
        return [];
      }
      if (type === "character") {
        // Find all characters (recursive)
        const findCharacters = (node: any, isRoot: boolean = false): any[] => {
          if (node && node.label === "LineMask") {
            return [];
          }
          if (!node.children || node.children.length === 0) {
            return isRoot ? [] : [node];
          }
          let results: any[] = [];
          for (const child of node.children) {
            results = results.concat(findCharacters(child));
          }
          return results;
        };
        return findCharacters(textContainer, true);
      } else {
        // type === "word"
        const hasLineContainers = textContainer.children.some(
          (child: any) => child && child.label === "LineContainer",
        );
        if (hasLineContainers) {
          const results: any[] = [];
          for (const child of textContainer.children) {
            if (child && child.label === "LineContainer" && child.children) {
              results.push(...child.children);
            }
          }
          return results;
        }
        return textContainer.children;
      }
    }

    return [target];
  }

  private initTimeline(target: any): void {
    const { from, to, stagger, type } = this.params;
    const durationInSeconds = this.options.duration / 1e6;

    // Identify animation targets based on type
    const animTargets: any[] = this.getCurrentTargets(target);

    // CRITICAL: Don't create the timeline if we have no targets but expected them.
    // By keeping this.timeline as null, the apply method will keep retrying every frame.
    if ((type === "character" || type === "word") && animTargets.length === 0) {
      if (this.timeline) {
        this.timeline.kill();
        this.timeline = null;
      }
      return;
    }

    // Re-initialize the timeline
    if (this.timeline) {
      this.timeline.kill();
    }
    // Restore original properties of old targets before clearing
    this.restoreOriginals();
    this.originalProperties.clear();

    this.timeline = gsap.timeline({ paused: true });
    animTargets.forEach((t) => {
      if (t.anchor) {
        if (!t.__ovAnchorAdjusted) {
          if (t.width > 0 && t.height > 0) {
            if (t.anchor.x !== 0.5 || t.anchor.y !== 0.5) {
              const oldX = t.anchor.x;
              const oldY = t.anchor.y;
              t.anchor.set(0.5, 0.5);
              const w = t.width / (t.scale?.x || 1);
              const h = t.height / (t.scale?.y || 1);
              t.x += (0.5 - oldX) * w * (t.scale?.x || 1);
              t.y += (0.5 - oldY) * h * (t.scale?.y || 1);
            }
            t.__ovAnchorAdjusted = true;
          }
        }
      } else if (t.pivot && t.getLocalBounds) {
        if (!t.__ovAnchorAdjusted) {
          const bounds = t.getLocalBounds();
          const cx = bounds.x + bounds.width / 2;
          const cy = bounds.y + bounds.height / 2;
          if (bounds.width > 0 && bounds.height > 0) {
            if (t.pivot.x !== cx || t.pivot.y !== cy) {
              const oldX = t.pivot.x;
              const oldY = t.pivot.y;
              t.pivot.set(cx, cy);
              t.x += (cx - oldX) * (t.scale?.x || 1);
              t.y += (cy - oldY) * (t.scale?.y || 1);
            }
            t.__ovAnchorAdjusted = true;
          }
        }
      }
    });

    // Populate original properties for new targets
    const animKeys = getAnimatedKeys(from, to);
    animTargets.forEach((t) => {
      const orig: Record<string, any> = {};
      t.__ovOriginalProperties = t.__ovOriginalProperties || {};
      animKeys.forEach((key) => {
        if (t.__ovOriginalProperties[key] === undefined) {
          t.__ovOriginalProperties[key] = getPixiProperty(t, key);
        }
        orig[key] = t.__ovOriginalProperties[key];
      });
      this.originalProperties.set(t, orig);
    });

    const staggerVal = typeof stagger === "number" ? stagger : 0;

    const isOut = this.isOutAnimation;

    // Add individual tweens to timeline
    animTargets.forEach((t, i) => {
      const orig = this.originalProperties.get(t) || {};
      const { resolvedFrom, resolvedTo } = resolveVars(from, to, orig, isOut);

      const finalFrom = prepareVars(resolvedFrom);
      const finalTo = prepareVars(resolvedTo);

      this.timeline!.add(
        gsap.fromTo(t, finalFrom, {
          duration: durationInSeconds,
          ease: this.options.easing as any,
          immediateRender: !isOut,
          ...finalTo,
        }),
        i * staggerVal,
      );
    });
  }

  destroy() {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    // Restore original properties of targets before clearing
    this.restoreOriginals();
    this.originalProperties.clear();
  }
}
