"use client";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";

interface TransformPropertyProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onXChange: (val: number) => void;
  onYChange: (val: number) => void;
  onWidthChange: (val: number) => void;
  onHeightChange: (val: number) => void;
}

export function TransformProperty({
  x,
  y,
  width,
  height,
  onXChange,
  onYChange,
  onWidthChange,
  onHeightChange,
}: TransformPropertyProps) {
  return (
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Transform</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-muted-foreground hover:text-foreground"
        >
          <span className="text-base leading-none">+</span>
        </Button>
      </div>

      <div className="py-1 flex flex-col gap-3">
        {/* Position - X & Y */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Position</span>
          <div className="flex w-[130px] gap-2">
            <InputGroup className="flex-1 h-8">
              <InputGroupAddon align="inline-start">
                <span className="text-[10px] text-muted-foreground">X</span>
              </InputGroupAddon>
              <NumberInput
                value={Math.round(x)}
                onChange={onXChange}
                className="pl-1 bg-transparent text-xs!"
              />
            </InputGroup>
            <InputGroup className="flex-1 h-8">
              <InputGroupAddon align="inline-start">
                <span className="text-[10px] text-muted-foreground">Y</span>
              </InputGroupAddon>
              <NumberInput
                value={Math.round(y)}
                onChange={onYChange}
                className="pl-1 bg-transparent text-xs!"
              />
            </InputGroup>
          </div>
        </div>

        {/* Size - W & H */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Size</span>
          <div className="flex w-[130px] gap-2">
            <InputGroup className="flex-1 h-8">
              <InputGroupAddon align="inline-start">
                <span className="text-[10px] text-muted-foreground">W</span>
              </InputGroupAddon>
              <NumberInput
                value={Math.round(width)}
                onChange={onWidthChange}
                className="pl-1 bg-transparent text-xs!"
              />
            </InputGroup>
            <InputGroup className="flex-1 h-8">
              <InputGroupAddon align="inline-start">
                <span className="text-[10px] text-muted-foreground">H</span>
              </InputGroupAddon>
              <NumberInput
                value={Math.round(height)}
                onChange={onHeightChange}
                className="pl-1 bg-transparent text-xs!"
              />
            </InputGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
