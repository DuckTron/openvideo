"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ColorPicker,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import color from "color";

// Types for effect property configs
type EffectPropertyConfig =
  | { type: "number"; min: number; max: number; step: number }
  | { type: "color" }
  | { type: "boolean" }
  | { type: "select"; options: { value: string; label: string }[] }
  | {
      type: "coordinates";
      min: { x: number; y: number };
      max: { x: number; y: number };
      step: { x: number; y: number };
    }
  | { type: "matrix"; size: number }
  | { type: "stops"; min: number; max: number; step: number }
  | { type: "replacements" }
  | { type: "pair"; min: number; max: number; step: number }[];

interface EffectProperty {
  key: string;
  label: string;
  config: EffectPropertyConfig;
}

interface EffectConfigPropertyProps {
  properties: EffectProperty[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function EffectConfigProperty({ properties, values, onChange }: EffectConfigPropertyProps) {
  const renderProperty = (prop: EffectProperty) => {
    const value = values[prop.key];
    const config = prop.config;

    switch (config.type) {
      case "number":
        return (
          <div key={prop.key} className="flex flex-col gap-1">
            <label className="text-[10px] text-muted-foreground">{prop.label}</label>
            <div className="flex items-center gap-2">
              <Slider
                value={[value ?? config.min]}
                onValueChange={(v) => onChange(prop.key, v[0])}
                min={config.min}
                max={config.max}
                step={config.step}
                className="flex-1"
              />
              <InputGroup className="w-20">
                <NumberInput
                  value={value ?? config.min}
                  onChange={(val) => onChange(prop.key, val)}
                  step={config.step}
                  className="p-0 text-center"
                />
              </InputGroup>
            </div>
          </div>
        );

      case "color":
        return (
          <div key={prop.key} className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <div
                  className="w-8 h-8 rounded-md border cursor-pointer"
                  style={{ backgroundColor: value || "#000000" }}
                />
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <ColorPicker
                  value={color(value || "#000000")
                    .hsv()
                    .array()}
                  onValueChange={(val) => {
                    const [h, s, v] = val;
                    const rgb = color({ h, s, v }).rgb().array();
                    onChange(
                      prop.key,
                      `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`,
                    );
                  }}
                  className="w-full"
                >
                  <div className="flex flex-col gap-3">
                    <ColorPickerSelection className="min-h-32 w-full rounded-md shadow-sm" />
                    <div className="flex flex-col gap-2">
                      <ColorPickerHue />
                      <ColorPickerEyeDropper />
                    </div>
                    <ColorPickerOutput className="text-center" />
                  </div>
                </ColorPicker>
              </PopoverContent>
            </Popover>
            <span className="text-xs">{prop.label}</span>
          </div>
        );

      case "boolean":
        return (
          <div key={prop.key} className="flex items-center gap-2">
            <Checkbox
              checked={value ?? false}
              onCheckedChange={(checked) => onChange(prop.key, checked)}
            />
            <label className="text-xs">{prop.label}</label>
          </div>
        );

      case "select":
        return (
          <div key={prop.key} className="flex flex-col gap-1">
            <label className="text-[10px] text-muted-foreground">{prop.label}</label>
            <Select value={String(value)} onValueChange={(v) => onChange(prop.key, v)}>
              <SelectTrigger>
                <SelectValue placeholder={prop.label} />
              </SelectTrigger>
              <SelectContent>
                {config.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "coordinates":
        return (
          <div key={prop.key} className="flex flex-col gap-1">
            <label className="text-[10px] text-muted-foreground">{prop.label}</label>
            <div className="grid grid-cols-2 gap-2">
              <InputGroup>
                <InputGroupAddon align="inline-start">X</InputGroupAddon>
                <NumberInput
                  value={value?.x ?? config.min.x}
                  onChange={(val) => onChange(prop.key, { ...value, x: val })}
                />
              </InputGroup>
              <InputGroup>
                <InputGroupAddon align="inline-start">Y</InputGroupAddon>
                <NumberInput
                  value={value?.y ?? config.min.y}
                  onChange={(val) => onChange(prop.key, { ...value, y: val })}
                />
              </InputGroup>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Effect Configuration
      </label>
      <div className="flex flex-col gap-3">{properties.map(renderProperty)}</div>
    </div>
  );
}

// Simple number input wrapper for InputGroup
function NumberInput({
  value,
  onChange,
  step = 1,
  className,
}: {
  value: number;
  onChange: (val: number) => void;
  step?: number;
  className?: string;
}) {
  return (
    <InputGroupInput
      type="number"
      value={value}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={className}
    />
  );
}
