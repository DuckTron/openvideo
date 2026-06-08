"use client";

import { IconTextSize, IconLineHeight, IconBold, IconItalic } from "@tabler/icons-react";
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

interface CaptionStylePropertyProps {
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
}

export function CaptionStyleProperty({
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
}: CaptionStylePropertyProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Style
      </label>

      {/* Font Size */}
      <div className="flex items-center gap-4">
        <IconTextSize className="size-4 text-muted-foreground" />
        <Slider
          value={[fontSize || 24]}
          onValueChange={(v) => onFontSizeChange(v[0])}
          min={12}
          max={72}
          step={1}
          className="flex-1"
        />
        <InputGroup className="w-20">
          <NumberInput
            value={fontSize || 24}
            onChange={onFontSizeChange}
            className="p-0 text-center"
          />
          <InputGroupAddon align="inline-end" className="p-0 pr-2">
            <span className="text-[10px] text-muted-foreground">px</span>
          </InputGroupAddon>
        </InputGroup>
      </div>

      {/* Line Height */}
      <div className="flex items-center gap-4">
        <IconLineHeight className="size-4 text-muted-foreground" />
        <Slider
          value={[lineHeight || 1.4]}
          onValueChange={(v) => onLineHeightChange(v[0])}
          min={1}
          max={2}
          step={0.1}
          className="flex-1"
        />
        <InputGroup className="w-20">
          <NumberInput
            value={lineHeight || 1.4}
            onChange={onLineHeightChange}
            step={0.1}
            className="p-0 text-center"
          />
        </InputGroup>
      </div>

      {/* Style Toggles */}
      <div className="flex items-center gap-1">
        <Button
          variant={fontWeight === "bold" ? "default" : "outline"}
          size="icon"
          className="size-8"
          onClick={() => onFontWeightChange(fontWeight === "bold" ? "normal" : "bold")}
        >
          <IconBold className="size-4" />
        </Button>
        <Button
          variant={fontStyle === "italic" ? "default" : "outline"}
          size="icon"
          className="size-8"
          onClick={() => onFontStyleChange(fontStyle === "italic" ? "normal" : "italic")}
        >
          <IconItalic className="size-4" />
        </Button>
      </div>

      {/* Text Transform */}
      <Select value={textTransform} onValueChange={(v) => onTextTransformChange(v as any)}>
        <SelectTrigger>
          <SelectValue placeholder="Text transform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Transform</SelectItem>
          <SelectItem value="uppercase">Uppercase</SelectItem>
          <SelectItem value="lowercase">Lowercase</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
