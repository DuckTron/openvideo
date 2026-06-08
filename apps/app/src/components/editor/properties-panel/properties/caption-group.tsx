"use client";

import React, { useState, useMemo } from "react";
import {
  IconTextSize,
  IconLineHeight,
  IconBold,
  IconItalic,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconChevronDown,
  IconCheck,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";
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
import { cn } from "@/lib/utils";
import color from "color";
import { getGroupedFonts, getFontByPostScriptName } from "@/utils/font-utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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
          {currentFamily.family === family.family && <IconCheck className="size-4 ml-2" />}
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
            className="w-full h-9 justify-between px-3 border-input"
          >
            <span className="truncate">{currentFamily.family}</span>
            <IconChevronDown className="size-4 opacity-50 shrink-0 ml-2" />
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

interface CaptionGroupPropertyProps {
  // Font
  currentFamily: string;
  currentFont: {
    postScriptName: string;
    fullName: string;
  };
  fontStyles: Array<{ id: string; postScriptName: string; fullName: string }>;
  onFontChange: (postScriptName: string) => void;
  onFontVariantChange: (postScriptName: string) => void;

  // Style
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textTransform: "none" | "uppercase" | "lowercase";
  lineHeight: number;
  onFontSizeChange: (val: number) => void;
  onFontWeightChange: (val: "normal" | "bold") => void;
  onFontStyleChange: (val: "normal" | "italic") => void;
  onTextTransformChange: (val: "none" | "uppercase" | "lowercase") => void;
  onLineHeightChange: (val: number) => void;

  // Caption Colors - all 5 options always shown
  appearedColor: string;
  activeColor: string;
  activeFillColor: string;
  backgroundColor: string;
  keywordColor: string;
  onAppearedColorChange: (val: string) => void;
  onActiveColorChange: (val: string) => void;
  onActiveFillColorChange: (val: string) => void;
  onBackgroundColorChange: (val: string) => void;
  onKeywordColorChange: (val: string) => void;

  // Layout
  textAlign: "left" | "center" | "right";
  verticalPosition: "top" | "center" | "bottom";
  wordsPerLine: number;
  maxLines: number;
  onTextAlignChange: (val: "left" | "center" | "right") => void;
  onVerticalPositionChange: (val: "top" | "center" | "bottom") => void;
  onWordsPerLineChange: (val: number) => void;
  onMaxLinesChange: (val: number) => void;
}

export function CaptionGroupProperty({
  // Font
  currentFamily,
  currentFont,
  fontStyles,
  onFontChange,
  onFontVariantChange,

  // Style
  fontSize,
  fontWeight,
  fontStyle,
  textTransform,
  lineHeight,
  onFontSizeChange,
  onFontWeightChange,
  onFontStyleChange,
  onTextTransformChange,
  onLineHeightChange,

  // Caption Colors - all 5
  appearedColor,
  activeColor,
  activeFillColor,
  backgroundColor,
  keywordColor,
  onAppearedColorChange,
  onActiveColorChange,
  onActiveFillColorChange,
  onBackgroundColorChange,
  onKeywordColorChange,

  // Layout
  textAlign,
  verticalPosition,
  wordsPerLine,
  maxLines,
  onTextAlignChange,
  onVerticalPositionChange,
  onWordsPerLineChange,
  onMaxLinesChange,
}: CaptionGroupPropertyProps) {
  const renderColorPicker = (
    colorValue: string,
    onChange: (val: string) => void,
    label: string,
  ) => (
    <div className="flex items-center gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <div
            className="w-6 h-6 rounded-md border cursor-pointer"
            style={{ backgroundColor: colorValue }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <ColorPicker
            value={color(colorValue).hsv().array()}
            onChange={(val) => {
              const [h, s, v] = val as number[];
              const rgb = color({ h, s, v }).rgb().array();
              onChange(`rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`);
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
      <span className="text-xs">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Colors Section */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Caption Colors
        </label>
        <div className="flex flex-col gap-2">
          {renderColorPicker(appearedColor, onAppearedColorChange, "Appeared")}
          {renderColorPicker(activeColor, onActiveColorChange, "Active")}
          {renderColorPicker(activeFillColor, onActiveFillColorChange, "Active Fill")}
          {renderColorPicker(backgroundColor, onBackgroundColorChange, "Background")}
          {renderColorPicker(keywordColor, onKeywordColorChange, "Keyword")}
        </div>
      </div>

      {/* Layout Section */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Layout
        </label>

        {/* Vertical Position */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground">Vertical Position</span>
          <Select
            value={verticalPosition}
            onValueChange={(v) => onVerticalPositionChange(v as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Words Per Line */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground">Words Per Line</span>
          <Select
            value={String(wordsPerLine)}
            onValueChange={(v) => onWordsPerLineChange(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Words per line" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 words</SelectItem>
              <SelectItem value="4">4 words</SelectItem>
              <SelectItem value="5">5 words</SelectItem>
              <SelectItem value="6">6 words</SelectItem>
              <SelectItem value="8">8 words</SelectItem>
              <SelectItem value="10">10 words</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Max Lines */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground">Max Lines</span>
          <Select value={String(maxLines)} onValueChange={(v) => onMaxLinesChange(Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Max lines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 line</SelectItem>
              <SelectItem value="2">2 lines</SelectItem>
              <SelectItem value="3">3 lines</SelectItem>
              <SelectItem value="4">4 lines</SelectItem>
              <SelectItem value="5">5 lines</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
