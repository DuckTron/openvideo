import { AnyClip } from "../types";

export function normalizeClipStyle(style: any, type: string): any {
  if (!style) return style;
  const normalized = { ...style };

  // Unify dropShadow into shadow
  if (normalized.dropShadow) {
    normalized.shadow = normalized.dropShadow;
    delete normalized.dropShadow;
  }

  if (normalized.shadow) {
    const shadow = { ...normalized.shadow };
    normalized.shadow = shadow;
  }

  if (type === "Text" || type === "Caption") {
    if (normalized.color === undefined) {
      normalized.color = "#ffffff";
    }
  }

  return normalized;
}

export function normalizeClip(clip: any): AnyClip {
  if (!clip) return clip;
  const normalized = { ...clip };

  // 1. Normalize timing
  if (!normalized.timing) {
    normalized.timing = {
      display: clip.display || { from: 0, to: 0 },
      trim: clip.trim || { from: 0, to: 0 },
      duration: clip.duration ?? 0,
      playbackRate: clip.playbackRate ?? 1,
      fadeIn: clip.fadeIn,
      fadeOut: clip.fadeOut,
    };
  } else {
    normalized.timing = {
      display: normalized.timing.display || { from: 0, to: 0 },
      trim: normalized.timing.trim || { from: 0, to: 0 },
      duration: normalized.timing.duration ?? 0,
      playbackRate: normalized.timing.playbackRate ?? 1,
      fadeIn: normalized.timing.fadeIn ?? clip.fadeIn,
      fadeOut: normalized.timing.fadeOut ?? clip.fadeOut,
    };
  }

  // 2. Normalize transform
  if (!normalized.transform) {
    normalized.transform = {
      x: clip.left ?? 0,
      y: clip.top ?? 0,
      width: clip.width ?? 0,
      height: clip.height ?? 0,
      angle: clip.angle ?? 0,
      opacity: clip.opacity ?? 1,
      zIndex: clip.zIndex ?? 10,
      flip: clip.flip || null,
    };
  } else {
    normalized.transform = {
      x: normalized.transform.x ?? clip.left ?? 0,
      y: normalized.transform.y ?? clip.top ?? 0,
      width: normalized.transform.width ?? clip.width ?? 0,
      height: normalized.transform.height ?? clip.height ?? 0,
      angle: normalized.transform.angle ?? clip.angle ?? 0,
      opacity: normalized.transform.opacity ?? clip.opacity ?? 1,
      zIndex: normalized.transform.zIndex ?? clip.zIndex ?? 10,
      flip: normalized.transform.flip ?? clip.flip ?? null,
    };
  }

  // 3. Normalize style
  if (normalized.style) {
    normalized.style = normalizeClipStyle(normalized.style, clip.type);
  }

  // Delete all legacy flat fields from the root level to keep the store clean
  delete normalized.display;
  delete normalized.trim;
  delete normalized.duration;
  delete normalized.playbackRate;
  delete normalized.left;
  delete normalized.top;
  delete normalized.width;
  delete normalized.height;
  delete normalized.angle;
  delete normalized.opacity;
  delete normalized.zIndex;
  delete normalized.flip;
  delete normalized.fadeIn;
  delete normalized.fadeOut;

  return normalized as AnyClip;
}
