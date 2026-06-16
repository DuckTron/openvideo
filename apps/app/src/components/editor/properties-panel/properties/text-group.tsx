"use client";

import React, { useState, useMemo } from "react";
import {
  RiArrowUpDownLine,
  RiCheckLine,
  RiAlignCenter,
  RiAlignLeft,
  RiAlignRight,
  RiStrikethrough,
  RiText,
  RiUnderline,
} from "@remixicon/react";
import { TextOverline } from "@/components/shared/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerOutput,
} from "@/components/ui/color-picker";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import color from "color";
import { Input } from "@/components/ui/input";
import { getGroupedFonts, getFontByPostScriptName } from "@/utils/font-utils";

const GROUPED_FONTS = getGroupedFonts();

const FontPicker = React.memo(
  ({
    currentFamily,
    handleFontChange,
  }: {
    currentFamily: { family: string };
    handleFontChange: (postScriptName: string) => void;
  }) => {
    const [isOpen, setIsOpen] = useState(false);

    const fontItems = useMemo(() => {
      return GROUPED_FONTS.map((family) => (
        <button
          key={family.family}
          className={cn(
            "flex w-full items-center px-2 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
            currentFamily.family === family.family && "bg-accent/50 text-accent-foreground",
          )}
          onClick={() => {
            handleFontChange(family.mainFont.postScriptName);
            setIsOpen(false);
          }}
        >
          <span className="flex-1 text-left">{family.family}</span>
          {currentFamily.family === family.family && <RiCheckLine className="size-4 ml-2" />}
        </button>
      ));
    }, [currentFamily.family, handleFontChange]);

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full h-7 justify-between px-3 border-input text-xs relative"
          >
            <span className="truncate">{currentFamily.family}</span>
            <RiArrowUpDownLine className="size-4 opacity-50 shrink-0 absolute right-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 gap-0" align="start">
          <ScrollArea className="h-72 w-full">
            <div className="flex flex-col p-1 gap-px">{fontItems}</div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  },
);

interface TextGroupPropertyProps {
  // Content
  text: string;
  onTextChange: (val: string) => void;

  // Font
  currentFamily: string;
  currentFont: {
    postScriptName: string;
    fullName: string;
  };
  fontStyles: Array<{ id: string; postScriptName: string; fullName: string }>;
  fontSize: number;
  onFontChange: (postScriptName: string) => void;
  onFontStyleChange: (postScriptName: string) => void;
  onFontSizeChange: (val: number) => void;

  // Alignment
  textAlign: "left" | "center" | "right";
  onTextAlignChange: (val: "left" | "center" | "right") => void;
  underline: boolean;
  overline: boolean;
  linethrough: boolean;
  onUnderlineChange: (val: boolean) => void;
  onOverlineChange: (val: boolean) => void;
  onLinethroughChange: (val: boolean) => void;

  // Case & Color
  textCase: "none" | "uppercase" | "lowercase";
  onTextCaseChange: (val: "none" | "uppercase" | "lowercase") => void;
  fill: string;
  onFillChange: (val: string) => void;

  // Background
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundBorderRadius?: number;
  backgroundPaddingX?: number;
  backgroundPaddingY?: number;
  onBackgroundColorChange?: (val: string) => void;
  onBackgroundOpacityChange?: (val: number) => void;
  onBackgroundBorderRadiusChange?: (val: number) => void;
  onBackgroundPaddingXChange?: (val: number) => void;
  onBackgroundPaddingYChange?: (val: number) => void;
}

export function TextGroupProperty({
  text,
  onTextChange,
  currentFamily,
  currentFont,
  fontStyles,
  fontSize,
  onFontChange,
  onFontStyleChange,
  onFontSizeChange,
  textAlign,
  onTextAlignChange,
  underline,
  overline,
  linethrough,
  onUnderlineChange,
  onOverlineChange,
  onLinethroughChange,
  textCase,
  onTextCaseChange,
  fill,
  onFillChange,
  backgroundColor,
  backgroundOpacity,
  backgroundBorderRadius,
  backgroundPaddingX,
  backgroundPaddingY,
  onBackgroundColorChange,
  onBackgroundOpacityChange,
  onBackgroundBorderRadiusChange,
  onBackgroundPaddingXChange,
  onBackgroundPaddingYChange,
}: TextGroupPropertyProps) {
  const [colorOpen, setColorOpen] = useState(false);
  const [bgColorOpen, setBgColorOpen] = useState(false);
  const bgEnabled =
    !!backgroundColor && backgroundColor !== "" && backgroundColor !== "transparent";

  return (
    <div className="flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Typography</span>
      </div>

      <div className="py-1 flex flex-col">
        {/* Content */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Content</span>
          <Input
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            className="w-[160px] h-7 text-xs! bg-secondary border rounded-md"
            placeholder="Text"
          />
        </div>
        {/* Font */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Font</span>
          <div className="w-[160px]">
            <FontPicker currentFamily={{ family: currentFamily }} handleFontChange={onFontChange} />
          </div>
        </div>

        {/* Style */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Style</span>
          <Select value={currentFont.postScriptName} onValueChange={onFontStyleChange}>
            <SelectTrigger className="w-[160px] h-7 bg-secondary border rounded-md text-xs!">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              {fontStyles.map((style) => (
                <SelectItem key={style.id} value={style.postScriptName}>
                  {style.fullName.replace(currentFamily, "").trim() || "Regular"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Size</span>
          <InputGroup className="w-[160px]">
            <NumberInput
              value={fontSize}
              onChange={onFontSizeChange}
              className="pl-2 bg-transparent text-xs!"
            />
            <InputGroupAddon align="inline-end">
              <RiText className="size-3.5" />
            </InputGroupAddon>
          </InputGroup>
        </div>

        {/* Align */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Align</span>
          <div className="flex items-center bg-secondary rounded-md p-0.5 w-[160px]">
            {[
              { icon: RiAlignLeft, value: "left" },
              { icon: RiAlignCenter, value: "center" },
              { icon: RiAlignRight, value: "right" },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => onTextAlignChange(item.value as "left" | "center" | "right")}
                className={cn(
                  "flex-1 flex items-center justify-center h-6 rounded-sm transition-colors",
                  textAlign === item.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="size-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Decoration */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Decoration</span>
          <div className="flex items-center bg-secondary rounded-md p-0.5 w-[160px]">
            {[
              { icon: RiUnderline, value: "underline", active: underline },
              { icon: TextOverline, value: "overline", active: overline },
              { icon: RiStrikethrough, value: "strikethrough", active: linethrough },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  if (item.value === "underline") onUnderlineChange(!underline);
                  if (item.value === "overline") onOverlineChange(!overline);
                  if (item.value === "strikethrough") onLinethroughChange(!linethrough);
                }}
                className={cn(
                  "flex-1 flex items-center justify-center h-6 rounded-sm transition-colors",
                  item.active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="size-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Case */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Case</span>
          <div className="flex items-center bg-secondary rounded-md p-0.5 w-[160px]">
            {[
              { label: "aA", value: "none" },
              { label: "AA", value: "uppercase" },
              { label: "aa", value: "lowercase" },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => onTextCaseChange(item.value as "none" | "uppercase" | "lowercase")}
                className={cn(
                  "flex-1 h-6 text-[10px] font-medium rounded-sm transition-colors",
                  textCase === item.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div className="flex items-center justify-between py-1 gap-4">
          <span className="text-xs text-muted-foreground">Color</span>
          <InputGroup className="w-[160px] h-7">
            <InputGroupAddon align="inline-start" className="relative p-0">
              <Popover modal={true} open={colorOpen} onOpenChange={setColorOpen}>
                <PopoverTrigger asChild>
                  <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8 pl-2">
                    <div
                      className="h-5 w-5 rounded-sm border border-input shadow-sm"
                      style={{ backgroundColor: fill || "#000000" }}
                    />
                  </InputGroupButton>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <ColorPicker
                    value={fill}
                    onChange={(colorValue: any) => {
                      const hexColor = color.rgb(colorValue as number[]).hex();
                      onFillChange(hexColor);
                    }}
                    className="w-72 h-72 rounded-md border bg-background p-4 shadow-sm"
                  >
                    <ColorPickerSelection />
                    <div className="flex items-center gap-4">
                      <ColorPickerEyeDropper />
                      <div className="grid w-full gap-1">
                        <ColorPickerHue />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ColorPickerOutput />
                      <ColorPickerFormat />
                    </div>
                  </ColorPicker>
                </PopoverContent>
              </Popover>
            </InputGroupAddon>
            <InputGroupInput
              value={(fill || "#000000").toUpperCase()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFillChange(e.target.value)}
              className="text-xs! p-0"
            />
          </InputGroup>
        </div>
      </div>

      {/* Line Background Section */}
      <div className="border-t border-border/40 mt-2 pt-2">
        <div className="flex items-center justify-between py-2">
          <span className="text-xs font-semibold text-foreground">Line Background</span>
          <button
            onClick={() => {
              if (bgEnabled) {
                onBackgroundColorChange?.("");
              } else {
                onBackgroundColorChange?.(backgroundColor || "#000000");
              }
            }}
            className={cn(
              "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
              bgEnabled ? "bg-primary" : "bg-secondary",
            )}
          >
            <span
              className={cn(
                "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                bgEnabled ? "translate-x-3.5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>

        {bgEnabled && (
          <div className="py-1 flex flex-col gap-1">
            {/* Bg Color */}
            <div className="flex items-center justify-between py-1 gap-4">
              <span className="text-xs text-muted-foreground">Color</span>
              <InputGroup className="w-[160px] h-7">
                <InputGroupAddon align="inline-start" className="relative p-0">
                  <Popover modal={true} open={bgColorOpen} onOpenChange={setBgColorOpen}>
                    <PopoverTrigger asChild>
                      <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8 pl-2">
                        <div
                          className="h-5 w-5 rounded-sm border border-input shadow-sm"
                          style={{ backgroundColor: backgroundColor || "#000000" }}
                        />
                      </InputGroupButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <ColorPicker
                        value={backgroundColor || "#000000"}
                        onChange={(colorValue: any) => {
                          const hexColor = color.rgb(colorValue as number[]).hex();
                          onBackgroundColorChange?.(hexColor);
                        }}
                        className="w-72 h-72 rounded-md border bg-background p-4 shadow-sm"
                      >
                        <ColorPickerSelection />
                        <div className="flex items-center gap-4">
                          <ColorPickerEyeDropper />
                          <div className="grid w-full gap-1">
                            <ColorPickerHue />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ColorPickerOutput />
                          <ColorPickerFormat />
                        </div>
                      </ColorPicker>
                    </PopoverContent>
                  </Popover>
                </InputGroupAddon>
                <InputGroupInput
                  value={(backgroundColor || "#000000").toUpperCase()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onBackgroundColorChange?.(e.target.value)
                  }
                  className="text-xs! p-0"
                />
              </InputGroup>
            </div>

            {/* Bg Opacity */}
            <div className="flex items-center justify-between py-1 gap-4">
              <span className="text-xs text-muted-foreground">Opacity</span>
              <div className="flex items-center gap-2 w-[160px]">
                <Slider
                  value={[backgroundOpacity ?? 1]}
                  onValueChange={([v]) => onBackgroundOpacityChange?.(v)}
                  min={0}
                  max={1}
                  step={0.05}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">
                  {Math.round((backgroundOpacity ?? 1) * 100)}%
                </span>
              </div>
            </div>

            {/* Bg Border Radius */}
            <div className="flex items-center justify-between py-1 gap-4">
              <span className="text-xs text-muted-foreground">Radius</span>
              <InputGroup className="w-[160px]">
                <NumberInput
                  value={backgroundBorderRadius ?? 4}
                  onChange={(v) => onBackgroundBorderRadiusChange?.(v)}
                  min={0}
                  className="pl-2 bg-transparent text-xs!"
                />
                <InputGroupAddon align="inline-end">
                  <span className="text-xs text-muted-foreground">px</span>
                </InputGroupAddon>
              </InputGroup>
            </div>

            {/* Bg Horizontal Padding */}
            <div className="flex items-center justify-between py-1 gap-4">
              <span className="text-xs text-muted-foreground">Pad X</span>
              <InputGroup className="w-[160px]">
                <NumberInput
                  value={backgroundPaddingX ?? 8}
                  onChange={(v) => onBackgroundPaddingXChange?.(v)}
                  min={0}
                  className="pl-2 bg-transparent text-xs!"
                />
                <InputGroupAddon align="inline-end">
                  <span className="text-xs text-muted-foreground">px</span>
                </InputGroupAddon>
              </InputGroup>
            </div>

            {/* Bg Vertical Padding */}
            <div className="flex items-center justify-between py-1 gap-4">
              <span className="text-xs text-muted-foreground">Pad Y</span>
              <InputGroup className="w-[160px]">
                <NumberInput
                  value={backgroundPaddingY ?? 4}
                  onChange={(v) => onBackgroundPaddingYChange?.(v)}
                  min={0}
                  className="pl-2 bg-transparent text-xs!"
                />
                <InputGroupAddon align="inline-end">
                  <span className="text-xs text-muted-foreground">px</span>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
