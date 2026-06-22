import gsap from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";
import { AnimationOptions, AnimationTransform, IAnimation } from "./types";

// Register PixiPlugin to support skewX, skewY, and other PixiJS properties
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

// List of properties that should be handled by PixiPlugin
const pixiProps = [
  "scale",
  "scaleX",
  "scaleY",
  "rotation",
  "skewX",
  "skewY",
  "skew",
  "pivotX",
  "pivotY",
  "pivot",
  "anchorX",
  "anchorY",
  "anchor",
  "blur",
  "brightness",
  "contrast",
  "grayscale",
  "hueRotate",
  "invert",
  "saturate",
  "threshold",
  "matrix",
];

const hasPixiProp = (obj: any) => obj && Object.keys(obj).some((key) => pixiProps.includes(key));

const prepareVars = (vars: any) => {
  if (!hasPixiProp(vars)) return vars;
  const newVars: any = { ...vars };
  const pixiVars: any = {};
  pixiProps.forEach((prop) => {
    if (prop in newVars) {
      pixiVars[prop] = newVars[prop];
      delete newVars[prop];
    }
  });
  newVars.pixi = pixiVars;
  return newVars;
};

function resolveValue(val: any, baseVal: number): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    if (val.startsWith("+=")) {
      return baseVal + parseFloat(val.substring(2));
    }
    if (val.startsWith("-=")) {
      return baseVal - parseFloat(val.substring(2));
    }
  }
  const parsed = parseFloat(val);
  return isNaN(parsed) ? baseVal : parsed;
}

function resolveVars(vars: any, baseSource: Record<string, any>): Record<string, any> {
  const resolved: Record<string, any> = {};
  if (!vars) return resolved;
  for (const key of Object.keys(vars)) {
    if (
      ["immediateRender", "ease", "duration", "stagger", "repeat", "yoyo", "keyframes"].includes(
        key,
      )
    ) {
      resolved[key] = vars[key];
      continue;
    }
    const baseVal = baseSource[key] ?? 0;
    resolved[key] = resolveValue(vars[key], baseVal);
  }

  if (vars.keyframes) {
    if (Array.isArray(vars.keyframes)) {
      resolved.keyframes = vars.keyframes.map((frame: any) => resolveVars(frame, baseSource));
    } else if (typeof vars.keyframes === "object") {
      const resolvedKf: Record<string, any> = {};
      for (const [kfKey, frame] of Object.entries(vars.keyframes)) {
        if (frame && typeof frame === "object") {
          resolvedKf[kfKey] = resolveVars(frame, baseSource);
        } else {
          resolvedKf[kfKey] = frame;
        }
      }
      resolved.keyframes = resolvedKf;
    }
  }

  return resolved;
}

function getAnimatedKeys(from: any, to: any): string[] {
  const keys = new Set<string>();
  const excludeKeys = [
    "immediateRender",
    "ease",
    "duration",
    "stagger",
    "repeat",
    "yoyo",
    "keyframes",
  ];
  if (from) {
    for (const key of Object.keys(from)) {
      if (!excludeKeys.includes(key)) keys.add(key);
    }
  }
  if (to) {
    for (const key of Object.keys(to)) {
      if (!excludeKeys.includes(key)) keys.add(key);
    }
    if (to.keyframes) {
      if (Array.isArray(to.keyframes)) {
        for (const frame of to.keyframes) {
          for (const key of Object.keys(frame)) {
            if (!excludeKeys.includes(key)) keys.add(key);
          }
        }
      } else if (typeof to.keyframes === "object") {
        for (const frame of Object.values(to.keyframes)) {
          if (frame && typeof frame === "object") {
            for (const key of Object.keys(frame)) {
              if (!excludeKeys.includes(key)) keys.add(key);
            }
          }
        }
      }
    }
  }
  return Array.from(keys);
}

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
        } catch (e) {
          // ignore
        }
      }
    });
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

      if (timelineTime < tStart) {
        // Force the starting values
        const orig = this.originalProperties.get(t) || {};
        const resolvedFrom = resolveVars(from, orig);
        const pixiFrom = prepareVars(resolvedFrom);
        gsap.set(t, pixiFrom);
      } else if (timelineTime > tEnd) {
        // Force the ending values
        const orig = this.originalProperties.get(t) || {};
        const resolvedFrom = resolveVars(from, orig);
        const baseForTo = { ...orig, ...resolvedFrom };
        const resolvedTo = resolveVars(to, baseForTo);
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
        return [...textContainer.children];
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
        if (t.anchor.x !== 0.5 || t.anchor.y !== 0.5) {
          const oldX = t.anchor.x;
          const oldY = t.anchor.y;
          t.anchor.set(0.5, 0.5);
          const w = t.width / (t.scale?.x || 1);
          const h = t.height / (t.scale?.y || 1);
          t.x += (0.5 - oldX) * w * (t.scale?.x || 1);
          t.y += (0.5 - oldY) * h * (t.scale?.y || 1);
        }
      } else if (t.pivot && t.getLocalBounds) {
        const bounds = t.getLocalBounds();
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        if (t.pivot.x !== cx || t.pivot.y !== cy) {
          const oldX = t.pivot.x;
          const oldY = t.pivot.y;
          t.pivot.set(cx, cy);
          t.x += (cx - oldX) * (t.scale?.x || 1);
          t.y += (cy - oldY) * (t.scale?.y || 1);
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
          t.__ovOriginalProperties[key] = gsap.getProperty(t, key);
        }
        orig[key] = t.__ovOriginalProperties[key];
      });
      this.originalProperties.set(t, orig);
    });

    const staggerVal = typeof stagger === "number" ? stagger : 0;

    // Add individual tweens to timeline
    animTargets.forEach((t, i) => {
      const orig = this.originalProperties.get(t) || {};
      const resolvedFrom = resolveVars(from, orig);
      const baseForTo = { ...orig, ...resolvedFrom };
      const resolvedTo = resolveVars(to, baseForTo);

      const finalFrom = prepareVars(resolvedFrom);
      const finalTo = prepareVars(resolvedTo);

      const isOut = this.isOutAnimation;
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
