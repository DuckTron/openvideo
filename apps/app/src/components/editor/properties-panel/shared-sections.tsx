import * as React from "react";
import {
  ColorPicker,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  IconLineHeight,
  IconMinus,
  IconPlus,
  IconBlur,
  IconRuler2,
  IconRotate,
  IconEdit,
  IconTrash,
  IconFlipHorizontal,
  IconFlipVertical,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import color from "color";

// Section Header Component
interface SectionHeaderProps {
  title: string;
  hasContent: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

export function SectionHeader({ title, hasContent, onAdd, onRemove }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between py-1 h-12">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 rounded-sm"
        onClick={hasContent ? onRemove : onAdd}
      >
        {hasContent ? <IconMinus className="size-4" /> : <IconPlus className="size-4" />}
      </Button>
    </div>
  );
}

// Reusable Shadow Property Section
interface ShadowPropertyProps {
  open: boolean;
  onAdd: () => void;
  onRemove: () => void;
  distance: number;
  angle: number;
  blur: number;
  color: string;
  onDistanceChange: (val: number) => void;
  onAngleChange: (val: number) => void;
  onBlurChange: (val: number) => void;
  onColorChange: (val: string) => void;
}

export function ShadowProperty({
  open,
  onAdd,
  onRemove,
  distance,
  angle,
  blur,
  color: shadowColor,
  onDistanceChange,
  onAngleChange,
  onBlurChange,
  onColorChange,
}: ShadowPropertyProps) {
  const hasShadow = blur > 0 || distance > 0;

  return (
    <Collapsible open={open}>
      <SectionHeader title="Shadow" hasContent={hasShadow} onAdd={onAdd} onRemove={onRemove} />
      <CollapsibleContent>
        <div className="pb-2 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <IconRuler2 className="size-3.5" />
              </InputGroupAddon>
              <NumberInput value={distance || 0} onChange={onDistanceChange} />
            </InputGroup>

            <InputGroup>
              <InputGroupAddon align="inline-start">
                <IconRotate className="size-3.5" />
              </InputGroupAddon>
              <NumberInput
                value={Math.round(((angle || 0) * 180) / Math.PI)}
                onChange={onAngleChange}
              />
            </InputGroup>
          </div>

          <div className="flex gap-2">
            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start">
                <IconBlur className="size-3.5" />
              </InputGroupAddon>
              <NumberInput value={blur || 0} onChange={onBlurChange} />
            </InputGroup>

            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start" className="relative p-0">
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8">
                      <div
                        className="h-4 w-4 border border-white/10 shadow-sm"
                        style={{ backgroundColor: shadowColor || "#000000" }}
                      />
                    </InputGroupButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <ColorPicker
                      onChange={(colorValue) => {
                        const hexColor = color.rgb(colorValue).hex();
                        onColorChange(hexColor);
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
                value={(shadowColor || "#000000").toUpperCase()}
                onChange={(e) => onColorChange(e.target.value)}
                className="text-sm p-0 text-[10px] font-mono"
              />
            </InputGroup>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Reusable Stroke/Outline Property Section
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
            <InputGroup className="flex-[2]">
              <InputGroupAddon align="inline-start" className="relative p-0">
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8">
                      <div
                        className="h-4 w-4 rounded-full border border-white/10 shadow-sm"
                        style={{ backgroundColor: strokeColor || "#000000" }}
                      />
                    </InputGroupButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <ColorPicker
                      onChange={(colorValue) => {
                        const hexColor = color.rgb(colorValue).hex();
                        onColorChange(hexColor);
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
                value={(strokeColor || "#000000").toUpperCase()}
                onChange={(e) => onColorChange(e.target.value)}
                className="text-sm p-0 text-[10px] font-mono"
              />
              <InputGroupAddon align="inline-end" className="border-l border-white/5 pl-2">
                <span className="text-[10px]">100%</span>
              </InputGroupAddon>
            </InputGroup>

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

// Reusable DropShadow Section (for images/videos with distance/angle)
interface DropShadowPropertyProps {
  open: boolean;
  onAdd: () => void;
  onRemove: () => void;
  distance: number;
  angle: number;
  blur: number;
  color: string;
  onDistanceChange: (val: number) => void;
  onAngleChange: (val: number) => void;
  onBlurChange: (val: number) => void;
  onColorChange: (val: string) => void;
}

export function DropShadowProperty({
  open,
  onAdd,
  onRemove,
  distance,
  angle,
  blur,
  color: shadowColor,
  onDistanceChange,
  onAngleChange,
  onBlurChange,
  onColorChange,
}: DropShadowPropertyProps) {
  const hasShadow = blur > 0 || distance > 0;

  return (
    <Collapsible open={open}>
      <SectionHeader title="Shadow" hasContent={hasShadow} onAdd={onAdd} onRemove={onRemove} />
      <CollapsibleContent>
        <div className="pb-2 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <IconRuler2 className="size-3.5" />
              </InputGroupAddon>
              <NumberInput value={distance || 0} onChange={onDistanceChange} />
            </InputGroup>

            <InputGroup>
              <InputGroupAddon align="inline-start">
                <IconRotate className="size-3.5" />
              </InputGroupAddon>
              <NumberInput
                value={Math.round(((angle || 0) * 180) / Math.PI)}
                onChange={onAngleChange}
              />
            </InputGroup>
          </div>

          <div className="flex gap-2">
            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start">
                <IconBlur className="size-3.5" />
              </InputGroupAddon>
              <NumberInput value={blur || 0} onChange={onBlurChange} />
            </InputGroup>

            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start" className="relative p-0">
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8">
                      <div
                        className="h-4 w-4 border border-white/10 shadow-sm"
                        style={{ backgroundColor: shadowColor || "#000000" }}
                      />
                    </InputGroupButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <ColorPicker
                      onChange={(colorValue) => {
                        const hexColor = color.rgb(colorValue).hex();
                        onColorChange(hexColor);
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
                value={(shadowColor || "#000000").toUpperCase()}
                onChange={(e) => onColorChange(e.target.value)}
                className="text-sm p-0 text-[10px] font-mono"
              />
            </InputGroup>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Animation item type
export interface AnimationItem {
  id: string;
  type: string;
  options?: {
    id?: string;
    duration?: number;
  };
}

// Reusable Animations Property Section
interface AnimationsPropertyProps {
  animations: AnimationItem[];
  onAdd: () => void;
  onRemoveAll: () => void;
  onEdit: (animationId: string) => void;
  onRemove: (animationId: string) => void;
}

export function AnimationsProperty({
  animations,
  onAdd,
  onRemoveAll,
  onEdit,
  onRemove,
}: AnimationsPropertyProps) {
  const hasAnimations = animations.length > 0;

  return (
    <Collapsible open={hasAnimations}>
      <SectionHeader
        title="Animations"
        hasContent={hasAnimations}
        onAdd={onAdd}
        onRemove={onRemoveAll}
      />
      <CollapsibleContent>
        <div className="pb-2 flex flex-col gap-2">
          {animations.map((anim) => (
            <div
              key={anim.options?.id ?? anim.id}
              className="flex items-center justify-between p-2 bg-secondary/30 rounded-md group"
            >
              <div className="flex flex-col flex-1">
                <span className="text-xs font-medium capitalize">{anim.type}</span>
                <span className="text-[10px] text-muted-foreground">
                  {Math.round((anim.options?.duration ?? 0) / 1e6)}s duration
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 group-hover:opacity-100"
                  onClick={() => onEdit(anim.id)}
                >
                  <IconEdit className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400"
                  onClick={() => onRemove(anim.id)}
                >
                  <IconTrash className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Reusable Chroma Key Property Section
interface ChromaKeyPropertyProps {
  enabled: boolean;
  color: string;
  similarity: number;
  spill: number;
  onEnabledChange: (enabled: boolean) => void;
  onColorChange: (color: string) => void;
  onSimilarityChange: (similarity: number) => void;
  onSpillChange: (spill: number) => void;
}

export function ChromaKeyProperty({
  enabled,
  color: chromaColor,
  similarity,
  spill,
  onEnabledChange,
  onColorChange,
  onSimilarityChange,
  onSpillChange,
}: ChromaKeyPropertyProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Chroma Key
        </label>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {enabled && (
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex gap-2">
            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start" className="relative p-0">
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8">
                      <div
                        className="h-4 w-4 rounded-full border border-white/10 shadow-sm"
                        style={{ backgroundColor: chromaColor || "#00FF00" }}
                      />
                    </InputGroupButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <ColorPicker
                      onChange={(colorValue) => {
                        const hexColor = color.rgb(colorValue).hex();
                        onColorChange(hexColor);
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
                value={(chromaColor || "#00FF00").toUpperCase()}
                onChange={(e) => onColorChange(e.target.value)}
                className="text-sm p-0 text-[10px] font-mono"
              />
            </InputGroup>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Similarity</span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round((similarity ?? 0.1) * 100)}%
              </span>
            </div>
            <Slider
              value={[(similarity ?? 0.1) * 100]}
              onValueChange={(v) => onSimilarityChange(v[0] / 100)}
              max={100}
              step={1}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Spill</span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round((spill ?? 0.05) * 100)}%
              </span>
            </div>
            <Slider
              value={[(spill ?? 0.05) * 100]}
              onValueChange={(v) => onSpillChange(v[0] / 100)}
              max={100}
              step={1}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Corner Radius Property Section
interface RadiusPropertyProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

export function RadiusProperty({ value, onChange, max = 500 }: RadiusPropertyProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Corner Radius
      </label>
      <div className="flex items-center gap-4">
        <div className="size-4 border border-muted-foreground/30 rounded-sm" />
        <Slider
          value={[value || 0]}
          onValueChange={(v) => onChange(v[0])}
          max={max}
          step={1}
          className="flex-1"
        />
        <InputGroup className="w-20">
          <NumberInput value={value || 0} onChange={onChange} className="p-0 text-center" />
          <InputGroupAddon align="inline-end" className="p-0 pr-2">
            <span className="text-[10px] text-muted-foreground">px</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

// Reusable Transform Property Section
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
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Transform
      </label>
      <div className="grid grid-cols-2 gap-2">
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <span className="text-[10px] font-medium text-muted-foreground">X</span>
          </InputGroupAddon>
          <NumberInput value={Math.round(x)} onChange={onXChange} className="p-0" />
        </InputGroup>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <span className="text-[10px] font-medium text-muted-foreground">Y</span>
          </InputGroupAddon>
          <NumberInput value={Math.round(y)} onChange={onYChange} className="p-0" />
        </InputGroup>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <span className="text-[10px] font-medium text-muted-foreground">W</span>
          </InputGroupAddon>
          <NumberInput value={Math.round(width)} onChange={onWidthChange} className="p-0" />
        </InputGroup>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <span className="text-[10px] font-medium text-muted-foreground">H</span>
          </InputGroupAddon>
          <NumberInput value={Math.round(height)} onChange={onHeightChange} className="p-0" />
        </InputGroup>
      </div>
    </div>
  );
}

// Reusable Rotation Property Section
interface RotationPropertyProps {
  value: number;
  onChange: (val: number) => void;
  max?: number;
}

export function RotationProperty({ value, onChange, max = 360 }: RotationPropertyProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Rotation
      </label>
      <div className="flex items-center gap-4">
        <IconRotate className="size-4 text-muted-foreground" />
        <Slider
          value={[Math.round(value)]}
          onValueChange={(v) => onChange(v[0])}
          max={max}
          step={1}
          className="flex-1"
        />
        <InputGroup className="w-20">
          <NumberInput value={Math.round(value)} onChange={onChange} className="p-0 text-center" />
          <InputGroupAddon align="inline-end" className="p-0 pr-2">
            <span className="text-[10px] text-muted-foreground">°</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

// Reusable Opacity Property Section
interface OpacityPropertyProps {
  value: number;
  onChange: (val: number) => void;
}

export function OpacityProperty({ value, onChange }: OpacityPropertyProps) {
  const percentage = Math.round(value * 100);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Opacity
      </label>
      <div className="flex items-center gap-4">
        <div className="size-4 rounded-full border border-muted-foreground/30" />
        <Slider
          value={[percentage]}
          onValueChange={(v) => onChange(v[0] / 100)}
          max={100}
          step={1}
          className="flex-1"
        />
        <InputGroup className="w-20">
          <NumberInput
            value={percentage}
            onChange={(val) => onChange(val / 100)}
            className="p-0 text-center"
          />
          <InputGroupAddon align="inline-end" className="p-0 pr-2">
            <span className="text-[10px] text-muted-foreground">%</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

// Flip values type
interface FlipValues {
  x: boolean;
  y: boolean;
}

// Reusable Flip Property Section
interface FlipPropertyProps {
  value: FlipValues;
  onChange: (flip: FlipValues) => void;
}

export function FlipProperty({ value, onChange }: FlipPropertyProps) {
  const { x, y } = value;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Flip
      </label>
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={() => onChange({ ...value, x: !x })}
          className={`flex items-center justify-center flex-1 py-1.5 rounded-md border transition-colors ${
            x
              ? "bg-primary/20 border-primary text-primary"
              : "bg-secondary/30 border-transparent text-muted-foreground hover:text-white"
          }`}
        >
          <IconFlipHorizontal className="size-4 mr-2" />
          <span className="text-xs">Flip X</span>
        </button>
        <button
          onClick={() => onChange({ ...value, y: !y })}
          className={`flex items-center justify-center flex-1 py-1.5 rounded-md border transition-colors ${
            y
              ? "bg-primary/20 border-primary text-primary"
              : "bg-secondary/30 border-transparent text-muted-foreground hover:text-white"
          }`}
        >
          <IconFlipVertical className="size-4 mr-2" />
          <span className="text-xs">Flip Y</span>
        </button>
      </div>
    </div>
  );
}
