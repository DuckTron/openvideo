"use client";

import { IconFlipHorizontal, IconFlipVertical } from "@tabler/icons-react";

export interface FlipValues {
  x: boolean;
  y: boolean;
}

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
