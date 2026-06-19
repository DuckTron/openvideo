"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ColorPicker,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import { Button } from "@/components/ui/button";
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react";
import color from "color";

interface FillPropertyProps {
  color: string;
  onColorChange: (color: string) => void;
}

/** Circular color swatch */
function CircularSwatch({ color: swatchColor }: { color: string }) {
  return (
    <div
      className="size-4 border border-border/50 shadow-sm flex-shrink-0 pointer-events-none"
      style={{ backgroundColor: swatchColor }}
    />
  );
}

export function FillProperty({ color: fillColor, onColorChange }: FillPropertyProps) {
  const [colorOpen, setColorOpen] = useState(false);

  const hasFill = fillColor && fillColor !== "" && fillColor !== "transparent";

  const handleAdd = () => {
    onColorChange("#3b82f6");
  };

  const handleRemove = () => {
    onColorChange("transparent");
  };

  return (
    <div className="flex flex-col bg-card p-3">
      {/* Fill Row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Fill</span>

        <div className="flex items-center gap-2">
          {hasFill ? (
            <>
              {/* Color swatch button - opens picker */}
              <Popover modal={true} open={colorOpen} onOpenChange={setColorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="icon" className="size-7">
                    <CircularSwatch color={fillColor} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <ColorPicker
                    value={fillColor}
                    onChange={(colorValue) => {
                      const hexColor = color.rgb(colorValue as number[]).hex();
                      onColorChange(hexColor);
                    }}
                    className="w-72 h-72 border bg-background p-4 shadow-sm"
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

              {/* Remove button */}
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={handleRemove}
                title="Remove fill"
              >
                <RiDeleteBinLine className="size-4" />
              </Button>
            </>
          ) : (
            /* Add button - when no fill */
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={handleAdd}
              title="Add fill"
            >
              <RiAddLine className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
