import { describe, it, expect } from "vitest";
import { BaseClip } from "./base-clip";
import { ClipRegistry } from "./clip-registry";
import { jsonToClip, clipToJSON } from "../json-serialization";

// Define a minimal custom clip type for testing
class CustomTestClip extends BaseClip {
  readonly type = "CustomTest";

  private _meta = {
    duration: 10e6,
    width: 640,
    height: 360,
  };

  get meta() {
    return this._meta;
  }

  customProp: string;

  constructor(customProp: string) {
    super();
    this.customProp = customProp;
    this.ready = Promise.resolve(this._meta);
    this.duration = this._meta.duration;
  }

  async tick() {
    return {
      video: undefined,
      state: "success" as const,
    };
  }

  async clone() {
    const cloned = new CustomTestClip(this.customProp);
    this.copyStateTo(cloned);
    return cloned as this;
  }

  async split(_time: number): Promise<[this, this]> {
    return [this, this];
  }

  toJSON(main?: boolean): any {
    const base = super.toJSON(main);
    return {
      ...base,
      type: "CustomTest",
      customProp: this.customProp,
    };
  }

  static async fromObject(json: any): Promise<CustomTestClip> {
    if (json.type !== "CustomTest") {
      throw new Error(`Expected CustomTest, got ${json.type}`);
    }
    const clip = new CustomTestClip(json.customProp || "default");
    BaseClip.deserializeBaseProperties(clip as any, json);
    return clip;
  }
}

describe("ClipRegistry & Custom Clips", () => {
  it("should have all default core clips registered", () => {
    const registeredTypes = ClipRegistry.getRegisteredTypes();
    expect(registeredTypes).toContain("Video");
    expect(registeredTypes).toContain("Audio");
    expect(registeredTypes).toContain("Image");
    expect(registeredTypes).toContain("Text");
    expect(registeredTypes).toContain("Caption");
    expect(registeredTypes).toContain("Effect");
    expect(registeredTypes).toContain("Transition");
    expect(registeredTypes).toContain("Placeholder");
    expect(registeredTypes).toContain("Shape");
  });

  it("should support dynamically registering a custom clip class", async () => {
    // Register the custom clip class
    ClipRegistry.register("CustomTest", CustomTestClip);

    // Verify it is registered
    expect(ClipRegistry.get("CustomTest")).toBe(CustomTestClip);
    expect(ClipRegistry.getRegisteredTypes()).toContain("CustomTest");

    // Define JSON representation of the custom clip
    const json = {
      type: "CustomTest" as const,
      id: "custom-123",
      name: "Custom Test Clip Name",
      customProp: "hello-world",
      transform: {
        x: 150,
        y: 250,
        width: 300,
        height: 200,
        angle: 45,
        opacity: 0.8,
        zIndex: 5,
        flip: { x: true, y: false },
      },
      timing: {
        display: { from: 1e6, to: 6e6 },
        trim: { from: 0, to: 5e6 },
        duration: 5e6,
        playbackRate: 1.5,
      },
      metadata: { author: "AI Agent" },
    };

    // Deserialize custom clip from JSON using jsonToClip
    const clip = (await jsonToClip(json as any)) as CustomTestClip;

    // Verify properties were correctly applied
    expect(clip).toBeInstanceOf(CustomTestClip);
    expect(clip.id).toBe("custom-123");
    expect(clip.name).toBe("Custom Test Clip Name");
    expect(clip.customProp).toBe("hello-world");
    expect(clip.left).toBe(150);
    expect(clip.top).toBe(250);
    expect(clip.width).toBe(300);
    expect(clip.height).toBe(200);
    expect(clip.angle).toBe(45);
    expect(clip.opacity).toBe(0.8);
    expect(clip.zIndex).toBe(5);
    expect(clip.flip).toEqual({ x: true, y: false });
    expect(clip.display.from).toBe(1e6);
    expect(clip.display.to).toBe(6e6);
    expect(clip.duration).toBe(5e6);
    expect(clip.playbackRate).toBe(1.5);
    expect(clip.metadata).toEqual({ author: "AI Agent" });

    // Serialize custom clip back to JSON
    const serialized = clipToJSON(clip);

    // Verify round-trip serialization outputs correct JSON
    expect(serialized.type).toBe("CustomTest");
    expect(serialized.id).toBe("custom-123");
    expect(serialized.name).toBe("Custom Test Clip Name");
    expect((serialized as any).customProp).toBe("hello-world");
    expect(serialized.transform).toEqual({
      x: 150,
      y: 250,
      width: 300,
      height: 200,
      angle: 45,
      opacity: 0.8,
      zIndex: 5,
      flip: { x: true, y: false },
    });
    expect(serialized.timing).toEqual({
      display: { from: 1e6, to: 6e6 },
      trim: { from: 0, to: 5e6 },
      duration: 5e6,
      playbackRate: 1.5,
      fadeIn: undefined,
      fadeOut: undefined,
    });
  });
});
