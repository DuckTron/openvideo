import { describe, it, expect } from "vitest";
import { Container } from "pixi.js";
import { GsapAnimation } from "./gsap-animation";

describe("GsapAnimation target resolution", () => {
  it("should default to root target when children are absent or type is not word/character", () => {
    const root = new Container();
    const anim = new GsapAnimation(
      {
        type: "line", // not word or character
        from: { alpha: 0 },
        to: { alpha: 1 },
      },
      { duration: 1000 },
    );

    const targets = (anim as any).getCurrentTargets(root);
    expect(targets).toEqual([root]);
  });

  it("should resolve words correctly when inside a TextOnlyContainer", () => {
    const root = new Container();
    const textOnlyContainer = new Container();
    textOnlyContainer.label = "TextOnlyContainer";
    root.addChild(textOnlyContainer);

    const word1 = new Container();
    const word2 = new Container();
    textOnlyContainer.addChild(word1);
    textOnlyContainer.addChild(word2);

    const anim = new GsapAnimation(
      {
        type: "word",
        from: { alpha: 0 },
        to: { alpha: 1 },
        stagger: 0.05,
      },
      { duration: 1000 },
    );

    const targets = (anim as any).getCurrentTargets(root);
    expect(targets).toEqual([word1, word2]);
    expect((anim as any).getTargetCount(root)).toBe(2);
  });

  it("should resolve characters correctly when inside a TextOnlyContainer", () => {
    const root = new Container();
    const textOnlyContainer = new Container();
    textOnlyContainer.label = "TextOnlyContainer";
    root.addChild(textOnlyContainer);

    const word1 = new Container();
    const word2 = new Container();
    textOnlyContainer.addChild(word1);
    textOnlyContainer.addChild(word2);

    const char1 = new Container();
    const char2 = new Container();
    const char3 = new Container();
    word1.addChild(char1);
    word1.addChild(char2);
    word2.addChild(char3);

    const anim = new GsapAnimation(
      {
        type: "character",
        from: { alpha: 0 },
        to: { alpha: 1 },
        stagger: 0.05,
      },
      { duration: 1000 },
    );

    const targets = (anim as any).getCurrentTargets(root);
    expect(targets).toEqual([char1, char2, char3]);
    expect((anim as any).getTargetCount(root)).toBe(3);
  });

  it("should degrade gracefully when TextOnlyContainer has no children", () => {
    const root = new Container();
    const textOnlyContainer = new Container();
    textOnlyContainer.label = "TextOnlyContainer";
    root.addChild(textOnlyContainer);

    const anim = new GsapAnimation(
      {
        type: "word",
        from: { alpha: 0 },
        to: { alpha: 1 },
        stagger: 0.05,
      },
      { duration: 1000 },
    );

    const targets = (anim as any).getCurrentTargets(root);
    expect(targets).toEqual([]);
    expect((anim as any).getTargetCount(root)).toBe(0);
  });
});

describe("GsapAnimation boundary values and stagger correctness", () => {
  it("should apply starting values to all staggered elements at progress 0", () => {
    const root = new Container();
    const textOnlyContainer = new Container();
    textOnlyContainer.label = "TextOnlyContainer";
    root.addChild(textOnlyContainer);

    const child1 = new Container();
    const child2 = new Container();
    child1.alpha = 1;
    child2.alpha = 1;
    textOnlyContainer.addChild(child1);
    textOnlyContainer.addChild(child2);

    const anim = new GsapAnimation(
      {
        type: "word",
        from: { alpha: 0 },
        to: { alpha: 1 },
        stagger: 0.1, // 0.1s
      },
      { duration: 1000000 }, // 1s
    );

    // Apply at time 0 (progress 0)
    anim.apply(root, 0);

    expect(child1.alpha).toBe(0);
    expect(child2.alpha).toBe(0);
  });

  it("should apply intermediate animation states and respect stagger boundaries", () => {
    const root = new Container();
    const textOnlyContainer = new Container();
    textOnlyContainer.label = "TextOnlyContainer";
    root.addChild(textOnlyContainer);

    const child1 = new Container();
    const child2 = new Container();
    child1.alpha = 1;
    child2.alpha = 1;
    textOnlyContainer.addChild(child1);
    textOnlyContainer.addChild(child2);

    const anim = new GsapAnimation(
      {
        type: "word",
        from: { alpha: 0 },
        to: { alpha: 1 },
        stagger: 0.1, // 0.1s
      },
      { duration: 1000000, easing: "linear" }, // 1s
    );

    // Timeline duration is 1.0 (duration) + 0.1 (stagger) = 1.1s
    // Apply at progress 0.05 (time = 50,000 microseconds, playhead = 0.055s)
    // child1: starts at 0, active (progress = 0.055 / 1.0 = 0.055)
    // child2: starts at 0.1, unstarted (0.055 < 0.1) -> should be manually set to starting value (alpha: 0)
    anim.apply(root, 50000);

    expect(child1.alpha).toBeCloseTo(0.055, 3);
    expect(child2.alpha).toBe(0);
  });

  it("should apply ending values to all elements at progress 1", () => {
    const root = new Container();
    const textOnlyContainer = new Container();
    textOnlyContainer.label = "TextOnlyContainer";
    root.addChild(textOnlyContainer);

    const child1 = new Container();
    const child2 = new Container();
    child1.alpha = 1;
    child2.alpha = 1;
    textOnlyContainer.addChild(child1);
    textOnlyContainer.addChild(child2);

    const anim = new GsapAnimation(
      {
        type: "word",
        from: { alpha: 0 },
        to: { alpha: 1 },
        stagger: 0.1,
      },
      { duration: 1000000 },
    );

    // Apply at progress 1 (time = 1,000,000 microseconds)
    anim.apply(root, 1000000);

    expect(child1.alpha).toBe(1);
    expect(child2.alpha).toBe(1);
  });

  it("should correctly resolve relative properties and restore original values on destroy", () => {
    const root = new Container();
    const textOnlyContainer = new Container();
    textOnlyContainer.label = "TextOnlyContainer";
    root.addChild(textOnlyContainer);

    const child1 = new Container();
    child1.y = 100;
    textOnlyContainer.addChild(child1);

    const anim = new GsapAnimation(
      {
        type: "word",
        from: { y: "+=50" },
        to: { y: "-=50" },
      },
      { duration: 1000000 },
    );

    // Apply at time 0: resolvedFrom y should be 150
    anim.apply(root, 0);
    expect(child1.y).toBe(150);

    // Apply at time 1,000,000: resolvedTo y should be resolvedFrom - 50 = 100
    anim.apply(root, 1000000);
    expect(child1.y).toBe(100);

    // Destroy animation: should restore to original y = 100
    anim.apply(root, 0); // y goes to 150 first
    expect(child1.y).toBe(150);
    anim.destroy();
    expect(child1.y).toBe(100);
  });

  it("should correctly handle overlapping in and out animations", () => {
    const root = new Container();
    const textOnlyContainer = new Container();
    textOnlyContainer.label = "TextOnlyContainer";
    root.addChild(textOnlyContainer);

    const child1 = new Container();
    child1.alpha = 1;
    child1.y = 100;
    textOnlyContainer.addChild(child1);

    const child2 = new Container();
    child2.alpha = 1;
    child2.y = 100;
    textOnlyContainer.addChild(child2);

    const animIn = new GsapAnimation(
      {
        type: "word",
        from: { alpha: 0, y: "+=50" },
        to: { alpha: 1, y: "-=50" },
        stagger: 0.1,
        metaMode: "in",
      } as any,
      { duration: 1000000, delay: 0 }, // 0s to 1s
    );

    const animOut = new GsapAnimation(
      {
        type: "word",
        from: { alpha: 1, y: "-=50" },
        to: { alpha: 0, y: "+=50" },
        stagger: 0.1,
        metaMode: "out",
      } as any,
      { duration: 1000000, delay: 4000000 }, // 4s to 5s
    );

    // Mock BaseSprite animations array in arbitrary order (exit before entrance) to test sorting robustness
    const animations = [animOut, animIn];

    const runAnimations = (time: number) => {
      const sorted = [...animations].sort(
        (a, b) => (a.options?.delay ?? 0) - (b.options?.delay ?? 0),
      );
      // Restore step
      sorted.forEach((anim) => anim.restoreOriginals());
      // Apply step
      sorted.forEach((anim) => anim.apply(root, time));
    };

    // 1. Before animIn starts (e.g. time = -500ms): should be in animIn's starting state (alpha: 0, y: 150)
    // animOut is also before start but it is "out", so it does nothing
    runAnimations(-500000);
    expect(child1.alpha).toBe(0);
    expect(child1.y).toBe(150);
    expect(child2.alpha).toBe(0);
    expect(child2.y).toBe(150);

    // 2. During animIn (e.g. time = 500ms, progress = 0.5):
    // animIn timeline duration = 1.1s (1.0 duration + 0.1 stagger)
    // timelineTime = 0.55s
    // child1 (starts at 0.0s): inside active window (eased progress = 0.55 / 1.0 = 0.55) -> alpha: 0.55, y: 122.5
    // child2 (starts at 0.1s): inside active window (eased progress = 0.45 / 1.0 = 0.45) -> alpha: 0.45, y: 127.5
    runAnimations(500000);
    expect(child1.alpha).toBeCloseTo(0.55, 2);
    expect(child1.y).toBeCloseTo(122.5, 1);
    expect(child2.alpha).toBeCloseTo(0.45, 2);
    expect(child2.y).toBeCloseTo(127.5, 1);

    // 3. Between animIn and animOut (e.g. time = 2s): should be in animIn's ending state (alpha: 1, y: 100)
    // animOut has not started yet so it does nothing
    runAnimations(2000000);
    expect(child1.alpha).toBe(1);
    expect(child1.y).toBe(100);
    expect(child2.alpha).toBe(1);
    expect(child2.y).toBe(100);

    // 4. During animOut (e.g. time = 4.5s, progress = 0.5):
    // animOut timeline duration = 1.1s (1.0 duration + 0.1 stagger)
    // timelineTime = 0.55s
    // child1 (starts at 0.0s): inside active window (eased progress = 0.55 / 1.0 = 0.55) -> alpha: 0.45, y: 72.5
    // child2 (starts at 0.1s): inside active window (eased progress = 0.45 / 1.0 = 0.45) -> alpha: 0.55, y: 77.5
    runAnimations(4500000);
    expect(child1.alpha).toBeCloseTo(0.45, 2);
    expect(child1.y).toBeCloseTo(72.5, 1);
    expect(child2.alpha).toBeCloseTo(0.55, 2);
    expect(child2.y).toBeCloseTo(77.5, 1);

    // 5. After animOut (e.g. time = 6s): should be in animOut's ending state (alpha: 0, y: 50)
    runAnimations(6000000);
    expect(child1.alpha).toBe(0);
    expect(child1.y).toBe(50);
    expect(child2.alpha).toBe(0);
    expect(child2.y).toBe(50);
  });
});
