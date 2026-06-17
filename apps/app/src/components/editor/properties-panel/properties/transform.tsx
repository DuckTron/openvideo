"use client";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";
import { RiLink, RiLinkUnlink } from "@remixicon/react";

interface TransformPropertyProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  locked?: boolean;
  onXChange: (val: number) => void;
  onYChange: (val: number) => void;
  onWidthChange: (val: number) => void;
  onHeightChange: (val: number) => void;
  onRotationChange?: (val: number) => void;
  onLockChange?: (locked: boolean) => void;
}

export function TransformProperty({
  x,
  y,
  width,
  height,
  rotation = 0,
  locked = false,
  onXChange,
  onYChange,
  onWidthChange,
  onHeightChange,
  onRotationChange,
  onLockChange,
}: TransformPropertyProps) {
  const aspectRatio = width / height || 1;

  const handleWidthChange = (val: number) => {
    onWidthChange(val);
    if (locked) {
      onHeightChange(Math.round(val / aspectRatio));
    }
  };

  const handleHeightChange = (val: number) => {
    onHeightChange(val);
    if (locked) {
      onWidthChange(Math.round(val * aspectRatio));
    }
  };

  return (
    <div className="flex flex-col bg-card p-3  rounded-lg gap-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Transform</span>
      </div>

      <div className="space-y-1.5">
        {/* X & Y */}
        <div className="flex gap-1.5 items-center">
          <InputGroup className="flex-1 h-7 rounded-md">
            <InputGroupAddon align="inline-start">
              <span className="text-xs text-muted-foreground px-2">X</span>
            </InputGroupAddon>
            <NumberInput value={Math.round(x)} onChange={onXChange} className="text-xs!" />
          </InputGroup>
          <InputGroup className="flex-1 h-7 rounded-md">
            <InputGroupAddon align="inline-start">
              <span className="text-xs text-muted-foreground px-2">Y</span>
            </InputGroupAddon>
            <NumberInput value={Math.round(y)} onChange={onYChange} className="text-xs!" />
          </InputGroup>
          <div className="w-8" /> {/* Spacer for alignment */}
        </div>

        {/* W & H with lock */}
        <div className="flex gap-1.5 items-center">
          <InputGroup className="flex-1 h-7 rounded-md">
            <InputGroupAddon align="inline-start">
              <span className="text-xs text-muted-foreground px-2">W</span>
            </InputGroupAddon>
            <NumberInput
              value={Math.round(width)}
              onChange={handleWidthChange}
              className="text-xs!"
            />
          </InputGroup>
          <InputGroup className="flex-1 h-7 rounded-md">
            <InputGroupAddon align="inline-start">
              <span className="text-xs text-muted-foreground px-2">H</span>
            </InputGroupAddon>
            <NumberInput
              value={Math.round(height)}
              onChange={handleHeightChange}
              className="text-xs!"
            />
          </InputGroup>
          <Button
            variant="secondary"
            size="icon"
            className="size-8 rounded-md shrink-0"
            onClick={() => onLockChange?.(!locked)}
            title={locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
          >
            {locked ? (
              <RiLink className="size-4" />
            ) : (
              <RiLinkUnlink className="size-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Rotation */}
        <div className="flex gap-2 items-center">
          <InputGroup className="flex-1 h-7 rounded-md">
            <InputGroupAddon align="inline-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M96,72a8,8,0,0,1,8-8A104.11,104.11,0,0,1,208,168a8,8,0,0,1-16,0,88.1,88.1,0,0,0-88-88A8,8,0,0,1,96,72ZM240,192H80V32a8,8,0,0,0-16,0V64H32a8,8,0,0,0,0,16H64V200a8,8,0,0,0,8,8H240a8,8,0,0,0,0-16Z"></path>
              </svg>
            </InputGroupAddon>
            <NumberInput
              value={Math.round(rotation)}
              onChange={(val) => onRotationChange?.(val)}
              className="text-xs px-3"
            />
          </InputGroup>
          <div className="flex-1" /> {/* Spacer for alignment */}
          <div className="w-8" /> {/* Spacer to align with lock button row */}
        </div>
      </div>
    </div>
  );
}
