"use client";

import { useState, useEffect } from "react";
import { IconClock } from "@tabler/icons-react";
import { Slider } from "@/components/ui/slider";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

interface TransitionDurationPropertyProps {
  value: number; // in microseconds
  min: number; // in microseconds
  max: number; // in microseconds
  onChange: (val: number) => void;
}

export function TransitionDurationProperty({
  value,
  min,
  max,
  onChange,
}: TransitionDurationPropertyProps) {
  // Convert to seconds for display
  const [localValue, setLocalValue] = useState(value / 1_000_000);

  useEffect(() => {
    setLocalValue(value / 1_000_000);
  }, [value]);

  const minSeconds = min / 1_000_000;
  const maxSeconds = max / 1_000_000;

  const handleCommit = (seconds: number) => {
    const fps = 30;
    let frameCount = Math.round(seconds * fps);
    if (frameCount % 2 !== 0) frameCount += 1;
    onChange((frameCount / fps) * 1_000_000);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Duration
      </label>
      <div className="flex gap-2">
        <div className="flex items-center gap-4 flex-1">
          <IconClock className="size-4 text-muted-foreground" />
          <Slider
            value={[localValue]}
            onValueChange={(v) => setLocalValue(v[0])}
            onValueCommit={(v) => handleCommit(v[0])}
            max={maxSeconds}
            min={minSeconds}
            step={0.1}
            className="flex-1"
          />
          <InputGroup className="w-20">
            <InputGroupInput
              type="number"
              value={localValue.toFixed(1)}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setLocalValue(val);
                onChange(val * 1_000_000);
              }}
              className="text-sm p-0 text-center"
            />
            <InputGroupAddon align="inline-end" className="p-0 pr-2">
              <span className="text-[10px] text-muted-foreground">s</span>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    </div>
  );
}
