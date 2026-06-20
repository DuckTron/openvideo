import { KeyframeAnimation } from "./keyframe-animation";
import { GsapAnimation } from "./gsap-animation";
import { WipeAnimation } from "./wipe-animation";
import {
  CircleRevealAnimation,
  RectExpandAnimation,
  AngleWipeAnimation,
  StarRevealAnimation,
  CenterExpandAnimation,
} from "./mask-animation";
import { AnimationOptions, IAnimation, KeyframeData } from "./types";

export type AnimationFactory = (options: AnimationOptions, params?: any) => IAnimation;

class AnimationRegistry {
  private factories = new Map<string, AnimationFactory>();

  constructor() {
    this.register(
      "keyframes",
      (options, params: KeyframeData) => new KeyframeAnimation(params, options),
    );
    const staggerFactory: AnimationFactory = (options, params) =>
      new GsapAnimation(params, options, "stagger");
    this.register("stagger", staggerFactory);
    this.register("wipe", (options, params) => new WipeAnimation(params, options));
    this.register("circleReveal", (options, params) => new CircleRevealAnimation(params, options));
    this.register("rectExpand", (options, params) => new RectExpandAnimation(params, options));
    this.register("angleWipe", (options, params) => new AngleWipeAnimation(params, options));
    this.register("starReveal", (options, params) => new StarRevealAnimation(params, options));
    this.register("centerExpand", (options, params) => new CenterExpandAnimation(params, options));
  }

  register(name: string, factory: AnimationFactory) {
    this.factories.set(name, factory);
  }

  create(name: string, options: AnimationOptions, params?: any): IAnimation {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Animation "${name}" not found in registry`);
    }
    return factory(options, params);
  }

  has(name: string): boolean {
    return this.factories.has(name);
  }
}

export const animationRegistry = new AnimationRegistry();
