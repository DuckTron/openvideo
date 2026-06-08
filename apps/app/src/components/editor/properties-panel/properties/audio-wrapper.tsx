"use client";

import { IClip } from "@openvideo/engine-pixi";
import { SharedAudioProperties } from "../shared-audio-properties";

interface AudioPropertyWrapperProps {
  clip: IClip;
}

// This is a thin wrapper around the existing SharedAudioProperties
// to maintain consistency with the new property architecture
export function AudioPropertyWrapper({ clip }: AudioPropertyWrapperProps) {
  return <SharedAudioProperties clip={clip} />;
}
