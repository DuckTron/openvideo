"use client";

import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { Slider } from "@/components/ui/slider";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";

interface FadePropertyProps {
  type: "in" | "out";
  duration: number;
  onChange: (val: number) => void;
  max?: number;
}

export function FadeProperty({ type, duration, onChange, max = 5000 }: FadePropertyProps) {
  const Icon = type === "in" ? IconTrendingUp : IconTrendingDown;
  const label = type === "in" ? "Fade In" : "Fade Out";

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <Icon className="size-4 text-muted-foreground flex-shrink-0" />
        <Slider
          value={[duration]}
          onValueChange={(v) => onChange(v[0])}
          min={0}
          max={max}
          step={100}
          className="flex-1"
        />
        <InputGroup className="w-24">
          <NumberInput
            value={duration}
            onChange={(val) => onChange(val || 0)}
            className="p-0 text-center text-xs"
          />
          <InputGroupAddon align="inline-end" className="p-0 pr-2">
            <span className="text-[10px] text-muted-foreground">ms</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
