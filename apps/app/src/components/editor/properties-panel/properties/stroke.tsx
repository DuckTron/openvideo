"use client";

import { IconLineHeight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  ColorPicker,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SectionHeader } from "./section-header";
import color from "color";

interface StrokePropertyProps {
  open: boolean;
  onAdd: () => void;
  onRemove: () => void;
  color: string;
  width: number;
  onColorChange: (val: string) => void;
  onWidthChange: (val: number) => void;
}

export function StrokeProperty({
  open,
  onAdd,
  onRemove,
  color: strokeColor,
  width,
  onColorChange,
  onWidthChange,
}: StrokePropertyProps) {
  const hasStroke = width > 0;

  return (
    <Collapsible open={open}>
      <SectionHeader title="Stroke" hasContent={hasStroke} onAdd={onAdd} onRemove={onRemove} />
      <CollapsibleContent>
        <div className="pb-2 flex flex-col gap-2">
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-10 h-9 p-0 border-input shrink-0"
                  style={{ backgroundColor: strokeColor || "#FFFFFF" }}
                />
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <ColorPicker
                  value={color(strokeColor || "#FFFFFF")
                    .hsv()
                    .array()}
                  onChange={(val) => {
                    const [h, s, v] = val as number[];
                    const rgb = color({ h, s, v }).rgb().array();
                    onColorChange(
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
                    <div className="flex gap-1">
                      <ColorPickerFormat />
                      <ColorPickerFormat />
                      <ColorPickerFormat />
                    </div>
                    <ColorPickerOutput className="text-center" />
                  </div>
                </ColorPicker>
              </PopoverContent>
            </Popover>

            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start">
                <IconLineHeight className="size-3.5" />
              </InputGroupAddon>
              <NumberInput value={width || 0} onChange={onWidthChange} />
            </InputGroup>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
