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
