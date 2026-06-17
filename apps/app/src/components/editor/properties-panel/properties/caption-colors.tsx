"use client";

import React from "react";
import { ColorPicker, ColorPickerSelection, ColorPickerHue } from "@/components/ui/color-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import color from "color";

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

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

function ColorSwatch({
  value,
  onChange,
  onClear,
}: {
  value?: string;
  onChange: (hex: string) => void;
  onClear?: () => void;
}) {
  const hasValue = !!value;
  return (
    <div className="flex items-center gap-1">
      {/* Clear button — only shown when a value is set */}
      {hasValue && onClear ? (
        <button
          onClick={onClear}
          className="size-3.5 rounded-full bg-muted-foreground/20 hover:bg-destructive/80 text-muted-foreground hover:text-white flex items-center justify-center text-[9px] leading-none flex-shrink-0 transition-colors"
          title="Remove"
        >
          ×
        </button>
      ) : (
        onClear && <span className="size-3.5 flex-shrink-0" />
      )}
      <Popover modal>
        <PopoverTrigger asChild>
          <button
            className="relative h-5 w-5 rounded flex-shrink-0 border border-white/10 focus:outline-none focus:ring-1 focus:ring-ring overflow-hidden"
            style={hasValue ? { backgroundColor: value } : undefined}
          >
            {!hasValue && (
              <span
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg,#555 25%,transparent 25%),linear-gradient(-45deg,#555 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#555 75%),linear-gradient(-45deg,transparent 75%,#555 75%)",
                  backgroundSize: "6px 6px",
                  backgroundPosition: "0 0,0 3px,3px -3px,-3px 0",
                }}
              />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3 h-48" align="end" side="bottom" sideOffset={4}>
          <ColorPicker
            onChange={(cv) => onChange(color.rgb(cv).hex())}
            className="w-full h-full flex flex-col gap-3"
          >
            <ColorPickerSelection />
            <div className="flex items-center gap-3">
              <ColorPickerHue className="flex-1" />
            </div>
          </ColorPicker>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between h-7">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
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
  return (
    <div className="flex flex-col gap-0.5 pb-3 mb-1 border-b border-border/60 last:border-0 last:pb-0 last:mb-0">
      {/* Section header */}
      <div className="flex items-center justify-between h-8">
        <span className="text-[11px] font-semibold text-foreground tracking-wide uppercase">
          {title}
        </span>
        <button
          onClick={onReset}
          className="size-5 flex items-center justify-center text-muted-foreground/50 hover:text-destructive transition-colors rounded"
          title="Reset"
        >
          <TrashIcon />
        </button>
      </div>

      <Row label="Fill">
        <ColorSwatch
          value={style.color}
          onChange={(hex) => onChange({ color: hex })}
          onClear={() => onChange({ color: undefined })}
        />
      </Row>

      {showBackground && (
        <Row label="Background">
          <ColorSwatch
            value={style.background}
            onChange={(hex) => onChange({ background: hex })}
            onClear={() => onChange({ background: undefined })}
          />
        </Row>
      )}

      <Row label="Border">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-muted/60 rounded px-1.5 h-5 border border-border/40">
            <span className="text-muted-foreground/60 text-[10px] select-none">≡</span>
            <input
              type="number"
              min={0}
              max={20}
              value={style.border?.width ?? 0}
              onChange={(e) =>
                onChange({ border: { ...(style.border ?? {}), width: Number(e.target.value) } })
              }
              className="w-6 text-[11px] bg-transparent border-0 p-0 text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <ColorSwatch
            value={style.border?.color}
            onChange={(hex) => onChange({ border: { ...(style.border ?? {}), color: hex } })}
            onClear={() => onChange({ border: { ...(style.border ?? {}), color: undefined } })}
          />
        </div>
      </Row>
    </div>
  );
}

function SlidersIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CaptionColorsProperty({ captionColors, setColors }: CaptionColorsPropertyProps) {
  const active = captionColors.active ?? {};
  const future = captionColors.future ?? {};

  return (
    <div className="flex flex-col">
      {/* Section label */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Style</span>
      </div>

      {/* Compact row: label + settings popover + quick swatches */}
      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-muted-foreground">Custom</span>
        <div className="flex items-center gap-1.5">
          {/* Settings popover */}
          <Popover modal>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
              >
                <SlidersIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end" side="left" sideOffset={8}>
              {/* Popover header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">Style</span>
              </div>

              {/* Content */}
              <div className="px-4 py-2 overflow-y-auto max-h-[70vh]">
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
              </div>
            </PopoverContent>
          </Popover>

          {/* Quick-access: active fill swatch */}
          <ColorSwatch
            value={active.color}
            onChange={(hex) => setColors({ ...captionColors, active: { ...active, color: hex } })}
            onClear={() => setColors({ ...captionColors, active: { ...active, color: undefined } })}
          />
          {/* Quick-access: active background swatch */}
          <ColorSwatch
            value={active.background}
            onChange={(hex) =>
              setColors({ ...captionColors, active: { ...active, background: hex } })
            }
            onClear={() =>
              setColors({ ...captionColors, active: { ...active, background: undefined } })
            }
          />
        </div>
      </div>
    </div>
  );
}
