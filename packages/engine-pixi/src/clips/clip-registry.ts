import type { IClip } from "./iclip";
import { Video } from "./video-clip";
import { Audio } from "./audio-clip";
import { Image } from "./image-clip";
import { Text } from "./text-clip";
import { Caption } from "./caption-clip";
import { Effect } from "./effect-clip";
import { Transition } from "./transition-clip";
import { Placeholder } from "./placeholder-clip";
import { ShapeClip } from "./shape-clip";

export type ClipClass = {
  fromObject(json: any): Promise<IClip>;
};

/**
 * Registry mapping clip type strings to their class constructors.
 * Supports default core clips and dynamic registration of custom clip types.
 */
export class ClipRegistry {
  private static registry = new Map<string, ClipClass>();

  /**
   * Register a clip class under a type name.
   */
  static register(type: string, klass: ClipClass) {
    this.registry.set(type, klass);
  }

  /**
   * Retrieve the registered clip class for a type.
   */
  static get(type: string): ClipClass | undefined {
    return this.registry.get(type);
  }

  /**
   * Get all registered clip types.
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.registry.keys());
  }
}

// Automatically register all core clip types
ClipRegistry.register("Video", Video);
ClipRegistry.register("Audio", Audio);
ClipRegistry.register("Image", Image);
ClipRegistry.register("Text", Text);
ClipRegistry.register("Caption", Caption);
ClipRegistry.register("Effect", Effect);
ClipRegistry.register("Transition", Transition);
ClipRegistry.register("Placeholder", Placeholder);
ClipRegistry.register("Shape", ShapeClip);
