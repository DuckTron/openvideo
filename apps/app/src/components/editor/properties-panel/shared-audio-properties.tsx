import * as React from "react";
import { IClip } from "@openvideo/engine-pixi";
import {
  IconVolume,
  IconEar,
  IconActivity,
  IconMicrophone,
  IconMicrowaveFilled,
  IconTrendingUp,
  IconTrendingDown,
} from "@tabler/icons-react";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "zustand";
import { projectStore, core } from "@/lib/project";

interface SharedAudioPropertiesProps {
  clip: IClip;
}

export function SharedAudioProperties({ clip }: SharedAudioPropertiesProps) {
  const coreClipBase = useStore(projectStore, (s) => s.clips[clip.id]);
  const coreClip = coreClipBase ?? clip;

  if (!coreClip) return null;

  const handleUpdate = (updates: any) => {
    core.clip.update(clip.id, updates);
  };

  const timing = coreClip.timing || {
    display: { from: 0, to: 0 },
    trim: { from: 0, to: 0 },
    duration: 0,
    playbackRate: 1,
  };

  const fadeIn = timing.fadeIn || { duration: 0, curve: "ease-out" };
  const fadeOut = timing.fadeOut || { duration: 0, curve: "ease-in" };

  const handleFadeInDurationChange = (val: number) => {
    const newFadeIn = val > 0 ? { duration: val, curve: fadeIn.curve || "ease-out" } : undefined;
    handleUpdate({
      timing: {
        ...timing,
        fadeIn: newFadeIn,
      },
    });
  };

  const handleFadeInCurveChange = (curve: "linear" | "ease-in" | "ease-out" | "ease-in-out") => {
    handleUpdate({
      timing: {
        ...timing,
        fadeIn: {
          ...fadeIn,
          curve,
        },
      },
    });
  };

  const handleFadeOutDurationChange = (val: number) => {
    const newFadeOut = val > 0 ? { duration: val, curve: fadeOut.curve || "ease-in" } : undefined;
    handleUpdate({
      timing: {
        ...timing,
        fadeOut: newFadeOut,
      },
    });
  };

  const handleFadeOutCurveChange = (curve: "linear" | "ease-in" | "ease-out" | "ease-in-out") => {
    handleUpdate({
      timing: {
        ...timing,
        fadeOut: {
          ...fadeOut,
          curve,
        },
      },
    });
  };

  // UI-only feature metadata helpers
  const metadata = coreClip.metadata || {};
  const isNoiseReduction = !!metadata.noiseReduction;
  const isBeatsDetection = !!metadata.beatsDetection;
  const isEnhanceVoice = !!metadata.enhanceVoice;

  const toggleMetadata = (key: string, val: boolean) => {
    handleUpdate({
      metadata: {
        ...metadata,
        [key]: val,
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Volume Section */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Volume
        </label>
        <div className="flex items-center gap-4">
          <IconVolume className="size-4 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[Math.round((coreClip.volume ?? 1) * 100)]}
            onValueChange={(v) => handleUpdate({ volume: v[0] / 100 })}
            max={100}
            step={1}
            className="flex-1"
          />
          <InputGroup className="w-20">
            <NumberInput
              value={Math.round((coreClip.volume ?? 1) * 100)}
              onChange={(val) => handleUpdate({ volume: (val || 0) / 100 })}
              className="p-0 text-center text-sm"
            />
            <InputGroupAddon align="inline-end" className="p-0 pr-2">
              <span className="text-[10px] text-muted-foreground">%</span>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      <div className="border-t border-white/5 my-1" />

      {/* Fades Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1.5">
          <IconMicrowaveFilled className="size-4 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Audio Fades
          </span>
        </div>

        {/* Fade In */}
        <div className="flex flex-col gap-2 bg-secondary/10 p-3 rounded-md border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white flex items-center gap-1.5">
              <IconTrendingUp className="size-3.5 text-green-400" />
              Fade In
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Slider
              value={[fadeIn.duration]}
              onValueChange={(v) => handleFadeInDurationChange(v[0])}
              min={0}
              max={5000}
              step={100}
              className="flex-1"
            />
            <InputGroup className="w-24">
              <NumberInput
                value={fadeIn.duration}
                onChange={(val) => handleFadeInDurationChange(val || 0)}
                className="p-0 text-center text-xs"
              />
              <InputGroupAddon align="inline-end" className="p-0 pr-2">
                <span className="text-[10px] text-muted-foreground">ms</span>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <div className="flex items-center justify-between gap-4 mt-1">
            <span className="text-[10px] text-muted-foreground">Curve</span>
            <Select
              value={fadeIn.curve || "ease-out"}
              onValueChange={(v: any) => handleFadeInCurveChange(v)}
            >
              <SelectTrigger className="w-28 h-7 text-xs py-0 bg-transparent border-white/10 hover:bg-white/5">
                <SelectValue placeholder="Curve" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="ease-in">Ease In</SelectItem>
                <SelectItem value="ease-out">Ease Out</SelectItem>
                <SelectItem value="ease-in-out">Ease In-Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fade Out */}
        <div className="flex flex-col gap-2 bg-secondary/10 p-3 rounded-md border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white flex items-center gap-1.5">
              <IconTrendingDown className="size-3.5 text-red-400" />
              Fade Out
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Slider
              value={[fadeOut.duration]}
              onValueChange={(v) => handleFadeOutDurationChange(v[0])}
              min={0}
              max={5000}
              step={100}
              className="flex-1"
            />
            <InputGroup className="w-24">
              <NumberInput
                value={fadeOut.duration}
                onChange={(val) => handleFadeOutDurationChange(val || 0)}
                className="p-0 text-center text-xs"
              />
              <InputGroupAddon align="inline-end" className="p-0 pr-2">
                <span className="text-[10px] text-muted-foreground">ms</span>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <div className="flex items-center justify-between gap-4 mt-1">
            <span className="text-[10px] text-muted-foreground">Curve</span>
            <Select
              value={fadeOut.curve || "ease-in"}
              onValueChange={(v: any) => handleFadeOutCurveChange(v)}
            >
              <SelectTrigger className="w-28 h-7 text-xs py-0 bg-transparent border-white/10 hover:bg-white/5">
                <SelectValue placeholder="Curve" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="ease-in">Ease In</SelectItem>
                <SelectItem value="ease-out">Ease Out</SelectItem>
                <SelectItem value="ease-in-out">Ease In-Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 my-1" />

      {/* Audio Features Section (UI-Only toggles) */}
      <div className="flex flex-col gap-3">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Audio Features
        </label>

        <div className="flex flex-col gap-2.5 bg-secondary/5 p-3 rounded-md border border-white/5">
          {/* Noise Reduction */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconEar className="size-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white">Noise Reduction</span>
                <span className="text-[10px] text-muted-foreground">Reduce background noise</span>
              </div>
            </div>
            <Switch
              checked={isNoiseReduction}
              onCheckedChange={(checked) => toggleMetadata("noiseReduction", checked)}
            />
          </div>

          <div className="border-t border-white/5 my-1.5" />

          {/* Enhance Voice */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconMicrophone className="size-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white">Enhance Voice</span>
                <span className="text-[10px] text-muted-foreground">
                  Clarify spoken frequencies
                </span>
              </div>
            </div>
            <Switch
              checked={isEnhanceVoice}
              onCheckedChange={(checked) => toggleMetadata("enhanceVoice", checked)}
            />
          </div>

          <div className="border-t border-white/5 my-1.5" />

          {/* Beats Detection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconActivity className="size-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white">Beats Detection</span>
                <span className="text-[10px] text-muted-foreground">Detect and snap to beats</span>
              </div>
            </div>
            <Switch
              checked={isBeatsDetection}
              onCheckedChange={(checked) => toggleMetadata("beatsDetection", checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
