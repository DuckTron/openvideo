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

interface TextColorPropertyProps {
  color: string;
  onColorChange: (color: string) => void;
}

/** Circular color swatch */
function CircularSwatch({ color: swatchColor }: { color: string }) {
  return (
    <div
      className="size-4 rounded-full border border-border/50 shadow-sm flex-shrink-0 pointer-events-none"
      style={{ backgroundColor: swatchColor }}
    />
  );
}

export function TextColorProperty({ color: textColor, onColorChange }: TextColorPropertyProps) {
  const [colorOpen, setColorOpen] = useState(false);

  const hasColor = textColor && textColor !== "" && textColor !== "transparent";

  const handleAdd = () => {
    onColorChange("#ffffff");
  };

  const handleRemove = () => {
    onColorChange("transparent");
  };

  return (
    <div className="flex flex-col bg-card p-3 rounded-lg">
      {/* Fill Row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Fill</span>

        <div className="flex items-center gap-2">
          {hasColor ? (
            <>
              {/* Color swatch button - opens picker */}
              <Popover modal={true} open={colorOpen} onOpenChange={setColorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-7 rounded-sm">
                    <CircularSwatch color={textColor} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <ColorPicker
                    value={textColor}
                    onChange={(colorValue: any) => {
                      const hexColor = color.rgb((colorValue as number[]).slice(0, 3)).hex();
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

              {/* Remove button */}
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-sm text-muted-foreground hover:text-destructive"
                onClick={handleRemove}
                title="Remove color"
              >
                <RiDeleteBinLine className="size-4" />
              </Button>
            </>
          ) : (
            /* Add button - when no color */
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-sm text-muted-foreground hover:text-foreground"
              onClick={handleAdd}
              title="Add color"
            >
              <RiAddLine className="size-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
