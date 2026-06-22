import gsap from "gsap";

// List of properties that should be handled by PixiPlugin
export const pixiProps = [
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

export const hasPixiProp = (obj: any) =>
  obj && Object.keys(obj).some((key) => pixiProps.includes(key));

export const prepareVars = (vars: any) => {
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

export function resolveValue(val: any, baseVal: number): number {
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

export function resolveVars(
  from: any,
  to: any,
  baseSource: Record<string, any>,
  isOut: boolean,
): { resolvedFrom: Record<string, any>; resolvedTo: Record<string, any> } {
  const resolvedFrom: Record<string, any> = {};
  const resolvedTo: Record<string, any> = {};

  const keys = new Set([...Object.keys(from || {}), ...Object.keys(to || {})]);

  for (const key of keys) {
    if (
      ["immediateRender", "ease", "duration", "stagger", "repeat", "yoyo", "keyframes"].includes(
        key,
      )
    ) {
      if (from && key in from) resolvedFrom[key] = from[key];
      if (to && key in to) resolvedTo[key] = to[key];
      continue;
    }

    const baseVal = baseSource[key] ?? 0;

    if (isOut) {
      // For exit (out) animations:
      // If the property has a relative value in 'from', it represents the offset.
      // We want to start at the rest value (baseVal) and end at the offset value (baseVal + offset).
      const fromVal = from ? from[key] : undefined;
      const toVal = to ? to[key] : undefined;

      const isFromRelative =
        typeof fromVal === "string" && (fromVal.startsWith("+=") || fromVal.startsWith("-="));
      const isToRelative =
        typeof toVal === "string" && (toVal.startsWith("+=") || toVal.startsWith("-="));

      if (isFromRelative) {
        resolvedFrom[key] = baseVal;
        const offset = resolveValue(fromVal, 0);
        resolvedTo[key] = baseVal + offset;
      } else if (isToRelative) {
        resolvedFrom[key] = fromVal !== undefined ? resolveValue(fromVal, baseVal) : baseVal;
        const offset = resolveValue(toVal, 0);
        resolvedTo[key] = resolvedFrom[key] + offset;
      } else {
        resolvedFrom[key] = fromVal !== undefined ? resolveValue(fromVal, baseVal) : baseVal;
        resolvedTo[key] = toVal !== undefined ? resolveValue(toVal, baseVal) : baseVal;
      }
    } else {
      // For entrance (in) animations:
      // Resolve from relative to baseSource, and to relative to resolvedFrom.
      const fromVal = from ? from[key] : undefined;
      const toVal = to ? to[key] : undefined;

      resolvedFrom[key] = fromVal !== undefined ? resolveValue(fromVal, baseVal) : baseVal;
      const baseForTo = resolvedFrom[key];
      resolvedTo[key] = toVal !== undefined ? resolveValue(toVal, baseForTo) : baseVal;
    }
  }

  // Handle keyframes
  if (to && to.keyframes) {
    if (Array.isArray(to.keyframes)) {
      resolvedTo.keyframes = to.keyframes.map((frame: any) => {
        const { resolvedTo: frameResolved } = resolveVars(
          null,
          frame,
          { ...baseSource, ...resolvedFrom },
          isOut,
        );
        return frameResolved;
      });
    } else if (typeof to.keyframes === "object") {
      const resolvedKf: Record<string, any> = {};
      for (const [kfKey, frame] of Object.entries(to.keyframes)) {
        if (frame && typeof frame === "object") {
          const { resolvedTo: frameResolved } = resolveVars(
            null,
            frame,
            { ...baseSource, ...resolvedFrom },
            isOut,
          );
          resolvedKf[kfKey] = frameResolved;
        } else {
          resolvedKf[kfKey] = frame;
        }
      }
      resolvedTo.keyframes = resolvedKf;
    }
  }

  return { resolvedFrom, resolvedTo };
}

export function getAnimatedKeys(from: any, to: any): string[] {
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

export function getPixiProperty(t: any, key: string): number {
  if (key === "scale" || key === "scaleX") {
    return t.scale?.x ?? 1;
  }
  if (key === "scaleY") {
    return t.scale?.y ?? 1;
  }
  if (key === "anchor" || key === "anchorX") {
    return t.anchor?.x ?? 0;
  }
  if (key === "anchorY") {
    return t.anchor?.y ?? 0;
  }
  if (key === "pivot" || key === "pivotX") {
    return t.pivot?.x ?? 0;
  }
  if (key === "pivotY") {
    return t.pivot?.y ?? 0;
  }
  if (key === "skew" || key === "skewX") {
    return ((t.skew?.x ?? 0) * 180) / Math.PI;
  }
  if (key === "skewY") {
    return ((t.skew?.y ?? 0) * 180) / Math.PI;
  }
  if (key === "rotation") {
    return t.angle ?? 0;
  }

  const val = gsap.getProperty(t, key);
  if (typeof val === "number") {
    return val;
  }
  if (val && typeof val === "object") {
    if ("x" in val && typeof (val as any).x === "number") {
      return (val as any).x;
    }
  }
  const parsed = parseFloat(val as any);
  return isNaN(parsed) ? 0 : parsed;
}
