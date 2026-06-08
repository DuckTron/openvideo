"use client";

import { IconBlur } from "@tabler/icons-react";
import { Slider } from "@/components/ui/slider";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";

interface BlurPropertyProps {
  value: number;
  onChange: (val: number) => void;
  max?: number;
}

export function BlurProperty({ value, onChange, max = 20 }: BlurPropertyProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Blur
      </label>
      <div className="flex items-center gap-4">
        <IconBlur className="size-4 text-muted-foreground" />
        <Slider
          value={[value || 0]}
          onValueChange={(v) => onChange(v[0])}
          max={max}
          step={0.5}
          className="flex-1"
        />
        <InputGroup className="w-20">
          <NumberInput
            value={value || 0}
            onChange={onChange}
            step={0.5}
            className="p-0 text-center"
          />
          <InputGroupAddon align="inline-end" className="p-0 pr-2">
            <span className="text-[10px] text-muted-foreground">px</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
