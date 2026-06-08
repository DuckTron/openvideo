import * as React from "react";
import { IClip } from "@openvideo/engine-pixi";
import useLayoutStore from "../store/use-layout-store";
import { useStore } from "zustand";
import { useEphemeralClip } from "@/hooks/use-ephemeral-clip";
import { projectStore, core } from "@/lib/project";
import { SharedAudioProperties } from "./shared-audio-properties";
import { Separator } from "@/components/ui/separator";
import {
  SectionHeader,
  StrokeProperty,
  ShadowProperty,
  AnimationsProperty,
  ChromaKeyProperty,
  RadiusProperty,
  TransformProperty,
  RotationProperty,
  OpacityProperty,
  FlipProperty,
} from "./shared-sections";

interface VideoPropertiesProps {
  clip: IClip;
}

export function VideoProperties({ clip }: VideoPropertiesProps) {
  const coreClipBase = useStore(projectStore, (s) => s.clips[clip.id]);
  // Use clip prop as fallback when store doesn't have the clip yet (selection race condition)
  const coreClip = useEphemeralClip(clip.id, coreClipBase ?? clip) as any;

  if (!coreClip) return null;

  const style = coreClip.style || {};
  const transform = coreClip.transform || {};

  // Handle both cases: ephemeral updates have top-level props (left, top, etc.)
  // and stored clips have nested transform props (transform.x, transform.y, etc.)
  const getX = () => coreClip.left ?? transform.x ?? 0;
  const getY = () => coreClip.top ?? transform.y ?? 0;
  const getWidth = () => coreClip.width ?? transform.width ?? 0;
  const getHeight = () => coreClip.height ?? transform.height ?? 0;
  const getAngle = () => coreClip.angle ?? transform.angle ?? 0;
  const getOpacity = () => coreClip.opacity ?? transform.opacity ?? 1;
  const getFlip = () => coreClip.flip ?? transform.flip ?? { x: false, y: false };
  const getVolume = () => coreClip.volume ?? 1;

  const handleUpdate = (updates: any) => {
    core.clip.update(clip.id, updates);
  };

  const handleStyleUpdate = (styleUpdates: any) => {
    handleUpdate({
      style: {
        ...style,
        ...styleUpdates,
      },
    });
  };

  const handleStrokeUpdate = (strokeUpdates: any) => {
    handleUpdate({
      style: {
        ...style,
        stroke: {
          ...(style.stroke || { color: "#ffffff", width: 0 }),
          ...strokeUpdates,
        },
      },
    });
  };

  const handleShadowUpdate = (shadowUpdates: any) => {
    const currentShadow = style.dropShadow || {
      color: "#000000",
      alpha: 1,
      blur: 0,
      distance: 0,
      angle: 0,
    };

    const finalUpdates: any = { ...shadowUpdates };

    if (shadowUpdates.angle !== undefined) {
      finalUpdates.angle = (parseFloat(shadowUpdates.angle) * Math.PI) / 180;
    }

    if (shadowUpdates.distance !== undefined) {
      finalUpdates.distance = parseFloat(shadowUpdates.distance) || 0;
    }

    handleUpdate({
      style: {
        ...style,
        dropShadow: {
          ...currentShadow,
          ...finalUpdates,
        },
      },
    });
  };
  const handleChromaKeyUpdate = (chromaUpdates: any) => {
    handleUpdate({
      chromaKey: {
        ...coreClip.chromaKey,
        ...chromaUpdates,
      },
    });
  };

  const { setFloatingControl } = useLayoutStore();

  const handleAnimationRemove = (id: string) => {
    const animations = (coreClip.animations || []).filter((a: any) => a.id !== id);
    handleUpdate({ animations });
  };

  const animations = coreClip.animations || [];

  // Check if sections have content
  const hasStroke = style.stroke?.width > 0;
  const hasShadow = style.dropShadow?.blur > 0;

  // Add/Remove handlers for sections
  const handleAddStroke = () => {
    handleUpdate({
      style: {
        ...style,
        stroke: { color: "#ffffff", width: 2 },
      },
    });
  };

  const handleRemoveStroke = () => {
    handleUpdate({
      style: {
        ...style,
        stroke: undefined,
      },
    });
  };

  const handleAddShadow = () => {
    handleUpdate({
      style: {
        ...style,
        dropShadow: { distance: 5, angle: Math.PI / 4, blur: 5, color: "#000000" },
      },
    });
  };

  const handleRemoveShadow = () => {
    handleUpdate({
      style: {
        ...style,
        dropShadow: { blur: 0 },
      },
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <TransformProperty
        x={getX()}
        y={getY()}
        width={getWidth()}
        height={getHeight()}
        onXChange={(val) => handleUpdate({ transform: { ...transform, x: val } })}
        onYChange={(val) => handleUpdate({ transform: { ...transform, y: val } })}
        onWidthChange={(val) => handleUpdate({ transform: { ...transform, width: val } })}
        onHeightChange={(val) => handleUpdate({ transform: { ...transform, height: val } })}
      />

      <RotationProperty
        value={getAngle()}
        onChange={(val) => handleUpdate({ transform: { ...transform, angle: val } })}
      />

      <FlipProperty
        value={getFlip()}
        onChange={(flip) => handleUpdate({ transform: { ...transform, flip } })}
      />

      {/* Audio properties */}
      <SharedAudioProperties clip={clip} />

      <OpacityProperty
        value={getOpacity()}
        onChange={(val) => handleUpdate({ transform: { ...transform, opacity: val } })}
      />

      <Separator className="bg-white/5" />

      <AnimationsProperty
        animations={animations}
        onAdd={() =>
          setFloatingControl("animation-properties-picker", {
            clipId: coreClip.id,
            mode: "add",
          })
        }
        onRemoveAll={() => handleAnimationRemove(animations[0]?.id)}
        onEdit={(animationId) =>
          setFloatingControl("animation-properties-picker", {
            clipId: coreClip.id,
            animationId,
            mode: "edit",
          })
        }
        onRemove={handleAnimationRemove}
      />

      <Separator className="bg-white/5" />

      <ChromaKeyProperty
        enabled={coreClip.chromaKey?.enabled ?? false}
        color={coreClip.chromaKey?.color || "#00FF00"}
        similarity={coreClip.chromaKey?.similarity ?? 0.1}
        spill={coreClip.chromaKey?.spill ?? 0.05}
        onEnabledChange={(enabled) => handleChromaKeyUpdate({ enabled })}
        onColorChange={(color) => handleChromaKeyUpdate({ color })}
        onSimilarityChange={(similarity) => handleChromaKeyUpdate({ similarity })}
        onSpillChange={(spill) => handleChromaKeyUpdate({ spill })}
      />

      <RadiusProperty
        value={style.borderRadius || 0}
        onChange={(val) => handleStyleUpdate({ borderRadius: val })}
      />

      <StrokeProperty
        open={hasStroke}
        onAdd={handleAddStroke}
        onRemove={handleRemoveStroke}
        color={(style.stroke?.color as string) || "#000000"}
        width={style.stroke?.width || 0}
        onColorChange={(color) => handleStrokeUpdate({ color })}
        onWidthChange={(width) => handleStrokeUpdate({ width })}
      />

      <ShadowProperty
        open={hasShadow}
        onAdd={handleAddShadow}
        onRemove={handleRemoveShadow}
        distance={style.dropShadow?.distance || 0}
        angle={style.dropShadow?.angle || 0}
        blur={style.dropShadow?.blur || 0}
        color={style.dropShadow?.color || "#000000"}
        onDistanceChange={(val: number) => handleShadowUpdate({ distance: val })}
        onAngleChange={(val: number) => handleShadowUpdate({ angle: val })}
        onBlurChange={(val) => handleShadowUpdate({ blur: val })}
        onColorChange={(val) => handleShadowUpdate({ color: val })}
      />
    </div>
  );
}
