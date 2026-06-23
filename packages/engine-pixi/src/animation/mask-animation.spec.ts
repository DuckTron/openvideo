import { describe, it, expect } from "vitest";
import { CenterExpandAnimation } from "./mask-animation";
import { WipeAnimation } from "./wipe-animation";

describe("Mask animations bounds check", () => {
  it("should return empty transform when reveal is finished or conceal has not started", () => {
    // 1. Reveal Animation (In)
    const revealAnim = new CenterExpandAnimation(
      { mode: "reveal", axis: "vertical" },
      { duration: 1000, delay: 0 },
    );

    // Active phase
    expect(revealAnim.getTransform(500).mask).toBeDefined();

    // Finished phase
    expect(revealAnim.getTransform(1500)).toEqual({});

    // 2. Conceal Animation (Out)
    const concealAnim = new CenterExpandAnimation(
      { mode: "conceal", axis: "vertical" },
      { duration: 1000, delay: 4000 },
    );

    // Before start phase
    expect(concealAnim.getTransform(2000)).toEqual({});

    // Active phase
    expect(concealAnim.getTransform(4500).mask).toBeDefined();

    // Finished phase (should be progress 0, i.e. fully concealed)
    const finishedTransform = concealAnim.getTransform(5500);
    expect(finishedTransform.mask).toBeDefined();
    expect(finishedTransform.mask?.progress).toBe(0);
  });

  it("should work similarly for WipeAnimation", () => {
    const revealWipe = new WipeAnimation(
      { mode: "reveal", direction: "left" },
      { duration: 1000, delay: 0 },
    );

    expect(revealWipe.getTransform(500).mask).toBeDefined();
    expect(revealWipe.getTransform(1500)).toEqual({});

    const concealWipe = new WipeAnimation(
      { mode: "conceal", direction: "left" },
      { duration: 1000, delay: 4000 },
    );

    expect(concealWipe.getTransform(2000)).toEqual({});
    expect(concealWipe.getTransform(4500).mask).toBeDefined();
    expect(concealWipe.getTransform(5500).mask?.progress).toBe(0);
  });
});
