"use client";

import { useState } from "react";
import { RiSubtractLine, RiArrowUpDownLine, RiEqualizer3Line } from "@remixicon/react";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { SectionHeader } from "./section-header";
import {
  ColorPicker,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import color from "color";

export interface CaptionWordStyle {
  color?: string;
  border?: { color?: string; width?: number };
  background?: string;
}

export interface CaptionColorsValue {
  active?: CaptionWordStyle;
  future?: CaptionWordStyle;
  keyword?: { color?: string; preserveAfterSpoken?: boolean };
}

interface CaptionColorsPropertyProps {
  captionColors: CaptionColorsValue;
  setColors: (colors: CaptionColorsValue) => void;
}

/** Simplified color row: swatch + hex input */
function ColorRow({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value?: string;
  fallback: string;
  onChange: (hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const display = value || fallback;

  return (
    <div className="flex items-center justify-between py-1 gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <InputGroup className="w-[160px] h-7">
        <InputGroupAddon align="inline-start" className="relative p-0">
          <Popover modal open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8 pl-2">
                <div
                  className="h-4 w-4 rounded-sm border border-input shadow-sm"
                  style={{ backgroundColor: display }}
                />
              </InputGroupButton>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <ColorPicker
                value={value}
                onChange={(cv) => onChange(color.rgb(cv as number[]).hex())}
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
          value={display.toUpperCase()}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs p-0 font-mono"
        />
      </InputGroup>
    </div>
  );
}

/** Brand-consistent number + color row for border */
function BorderRow({
  border,
  onChange,
}: {
  border?: { color?: string; width?: number };
  onChange: (patch: { color?: string; width?: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const borderColor = border?.color || "#FFFFFF";
  const borderWidth = border?.width ?? 0;

  return (
    <>
      <div className="flex items-center justify-between py-1 gap-4">
        <span className="text-xs text-muted-foreground">Border width</span>
        <InputGroup className="w-[160px] h-7">
          <InputGroupAddon align="inline-start">
            <RiArrowUpDownLine className="size-3.5" />
          </InputGroupAddon>
          <NumberInput
            value={borderWidth}
            min={0}
            max={20}
            onChange={(v) => onChange({ ...border, width: v })}
            className="pl-1 bg-transparent text-xs!"
          />
        </InputGroup>
      </div>

      <div className="flex items-center justify-between py-1 gap-4">
        <span className="text-xs text-muted-foreground">Border color</span>
        <InputGroup className="w-[160px] h-7">
          <InputGroupAddon align="inline-start" className="relative p-0">
            <Popover modal open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8 pl-2">
                  <div
                    className="h-4 w-4 rounded-sm border border-input shadow-sm"
                    style={{ backgroundColor: borderColor }}
                  />
                </InputGroupButton>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <ColorPicker
                  value={border?.color}
                  onChange={(cv) => onChange({ ...border, color: color.rgb(cv as number[]).hex() })}
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
            value={borderColor.toUpperCase()}
            onChange={(e) =>
              onChange({ ...border, color: e.target.value === "" ? undefined : e.target.value })
            }
            className="text-xs p-0 font-mono"
          />
        </InputGroup>
      </div>
    </>
  );
}

/** Keyword section with plus/minus header (consistent with other sections) */
function KeywordSection({
  keyword,
  onChange,
}: {
  keyword?: { color?: string; preserveAfterSpoken?: boolean };
  onChange: (keyword?: { color?: string; preserveAfterSpoken?: boolean }) => void;
}) {
  const isEnabled = keyword !== undefined;
  const preserveAfterSpoken = keyword?.preserveAfterSpoken ?? false;

  const handleAdd = () => {
    onChange({ color: "#FFFFFF", preserveAfterSpoken: false });
  };

  const handleRemove = () => {
    onChange(undefined);
  };

  return (
    <Collapsible open={isEnabled}>
      <SectionHeader
        title="Keyword"
        hasContent={isEnabled}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />
      <CollapsibleContent>
        <div className="flex flex-col gap-3 py-1">
          <ColorRow
            label="Fill"
            value={keyword?.color}
            fallback="#FFFFFF"
            onChange={(hex) => onChange({ ...keyword, color: hex === "" ? undefined : hex })}
          />

          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Preserve after spoken</span>
            <Switch
              checked={preserveAfterSpoken}
              onCheckedChange={(checked) => onChange({ ...keyword, preserveAfterSpoken: checked })}
              className="scale-75 origin-right"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function WordStyleSection({
  title,
  style,
  showBackground,
  onChange,
  onReset,
}: {
  title: string;
  style: CaptionWordStyle;
  showBackground: boolean;
  onChange: (patch: Partial<CaptionWordStyle>) => void;
  onReset: () => void;
}) {
  const hasAnyValue =
    !!style.color || !!style.background || !!style.border?.color || (style.border?.width ?? 0) > 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 rounded-sm text-muted-foreground"
          onClick={onReset}
          disabled={!hasAnyValue}
          title="Reset"
        >
          <RiSubtractLine className="size-4" />
        </Button>
      </div>

      <div className="py-1 flex flex-col">
        <ColorRow
          label="Fill"
          value={style.color}
          fallback="#FFFFFF"
          onChange={(hex) => onChange({ color: hex === "" ? undefined : hex })}
        />

        {showBackground && (
          <ColorRow
            label="Background"
            value={style.background}
            fallback="transparent"
            onChange={(hex) => onChange({ background: hex === "" ? undefined : hex })}
          />
        )}

        <BorderRow border={style.border} onChange={(patch) => onChange({ border: patch })} />
      </div>
    </div>
  );
}

export function CaptionColorsProperty({ captionColors, setColors }: CaptionColorsPropertyProps) {
  const active = captionColors.active ?? {};
  const future = captionColors.future ?? {};

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Caption Colors</span>
        <Popover modal>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 rounded-sm text-muted-foreground hover:text-foreground"
              title="Customize"
            >
              <RiEqualizer3Line className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end" side="left" sideOffset={8}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Caption Colors</span>
            </div>
            <div className="px-4 pb-3 overflow-y-auto max-h-[70vh] divide-y divide-border/60">
              <WordStyleSection
                title="Active word"
                style={active}
                showBackground
                onChange={(patch) =>
                  setColors({ ...captionColors, active: { ...active, ...patch } })
                }
                onReset={() => setColors({ ...captionColors, active: {} })}
              />
              <WordStyleSection
                title="Future words"
                style={future}
                showBackground={false}
                onChange={(patch) =>
                  setColors({ ...captionColors, future: { ...future, ...patch } })
                }
                onReset={() => setColors({ ...captionColors, future: {} })}
              />

              {/* Keyword section with enable toggle */}
              <KeywordSection
                keyword={captionColors.keyword}
                onChange={(keyword) => setColors({ ...captionColors, keyword })}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
