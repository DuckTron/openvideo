"use client";

import { IconTextSize, IconOverline, IconUnderline, IconStrikethrough } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";
import {
  ColorPicker,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import color from "color";

interface TextStylePropertyProps {
  size: number;
  color: string;
  backgroundColor?: string;
  underline: boolean;
  overline: boolean;
  linethrough: boolean;
  onSizeChange: (val: number) => void;
  onColorChange: (val: string) => void;
  onBackgroundColorChange?: (val: string) => void;
  onUnderlineChange: (val: boolean) => void;
  onOverlineChange: (val: boolean) => void;
  onLinethroughChange: (val: boolean) => void;
}

export function TextStyleProperty({
  size,
  color: textColor,
  backgroundColor,
  underline,
  overline,
  linethrough,
  onSizeChange,
  onColorChange,
  onBackgroundColorChange,
  onUnderlineChange,
  onOverlineChange,
  onLinethroughChange,
}: TextStylePropertyProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Text Style
      </label>

      {/* Size */}
      <div className="flex items-center gap-2">
        <IconTextSize className="size-4 text-muted-foreground" />
        <InputGroup className="flex-1">
          <NumberInput value={size} onChange={onSizeChange} className="text-center" />
          <InputGroupAddon align="inline-end" className="p-0 pr-2">
            <span className="text-[10px] text-muted-foreground">px</span>
          </InputGroupAddon>
        </InputGroup>
      </div>

      {/* Color */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <div
              className="w-8 h-8 rounded-md border cursor-pointer"
              style={{ backgroundColor: textColor }}
            />
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <ColorPicker
              value={color(textColor).hsv().array()}
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
        <span className="text-xs">Color</span>
      </div>

      {/* Background Color (optional) */}
      {onBackgroundColorChange && backgroundColor !== undefined && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <div
                className="w-8 h-8 rounded-md border cursor-pointer"
                style={{ backgroundColor: backgroundColor || "transparent" }}
              />
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <ColorPicker
                value={color(backgroundColor || "#000000")
                  .hsv()
                  .array()}
                onChange={(val) => {
                  const [h, s, v] = val as number[];
                  const rgb = color({ h, s, v }).rgb().array();
                  onBackgroundColorChange(
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
          <span className="text-xs">Background</span>
        </div>
      )}

      {/* Decorations */}
      <div className="flex items-center gap-1">
        <Button
          variant={underline ? "default" : "outline"}
          size="icon"
          className="size-8"
          onClick={() => onUnderlineChange(!underline)}
        >
          <IconUnderline className="size-4" />
        </Button>
        <Button
          variant={overline ? "default" : "outline"}
          size="icon"
          className="size-8"
          onClick={() => onOverlineChange(!overline)}
        >
          <IconOverline className="size-4" />
        </Button>
        <Button
          variant={linethrough ? "default" : "outline"}
          size="icon"
          className="size-8"
          onClick={() => onLinethroughChange(!linethrough)}
        >
          <IconStrikethrough className="size-4" />
        </Button>
      </div>
    </div>
  );
}
