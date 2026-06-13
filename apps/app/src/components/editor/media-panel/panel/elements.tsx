"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { createShapeClip, type ShapeElement } from "@/lib/shape-utils";
import { core } from "@/lib/project";
import { DEFAULT_FONT } from "../../constants/font";
import { toast } from "sonner";
import { IconInfoCircle } from "@tabler/icons-react";
import { ShapesIcon } from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function PanelElements() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Helper to add shape clips
  const handleAddShape = async (name: string, borderRadius?: number) => {
    setSelectedId(name);
    try {
      const element: ShapeElement = {
        id: name.toLowerCase(),
        name,
        shapeType: "rectangle",
        icon: "",
        borderRadius,
      };
      const shapeClip = createShapeClip(element);
      await core.clip.add(shapeClip);
      toast.success(`Added ${name} to timeline`);
    } catch (error) {
      console.error("Failed to add shape:", error);
    }
    setTimeout(() => setSelectedId(null), 300);
  };

  // Helper to add text clips
  const handleAddText = async (type: "text" | "subtitle" | "title") => {
    setSelectedId(type);
    try {
      const fontSize = type === "title" ? 120 : type === "subtitle" ? 80 : 40;
      const text = type === "title" ? "Title" : type === "subtitle" ? "Subtitle" : "Text";
      await core.clip.add({
        type: "Text",
        name: text,
        text: text,
        style: {
          fontSize,
          fontFamily: DEFAULT_FONT.postScriptName,
          align: "center",
          wordWrap: true,
          wordWrapWidth: 600,
          fontUrl: DEFAULT_FONT.url,
          color: "#ffffff",
        },
        timing: {
          display: { from: 0, to: 5_000_000 },
          trim: { from: 0, to: 5_000_000 },
        },
        left: 240,
        top: 360,
        width: 600,
      });
      toast.success(`Added ${type} preset`);
    } catch (error) {
      console.error("Failed to add text:", error);
    }
    setTimeout(() => setSelectedId(null), 300);
  };

  return (
    <div className="h-full flex flex-col relative bg-background p-2 gap-4 overflow-hidden select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between shrink-0 select-none px-2 py-1">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ShapesIcon className="size-4.5 text-foreground/80" />
          <span>Elements</span>
        </div>
      </div>

      {/* Sections container */}
      <div className="flex-1 overflow-y-auto px-1 pb-6 space-y-4 scrollbar-thin">
        {/* 1. Text Section */}
        <div className="bg-card border border-border/40 p-3.5 rounded-xl flex flex-col gap-2.5 shadow-sm">
          <span className="text-[12px] font-semibold text-foreground font-sans">Text</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleAddText("text")}
              className="py-3 px-2 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer text-foreground/90 hover:text-foreground text-xs font-normal"
            >
              Text
            </button>
            <button
              onClick={() => handleAddText("subtitle")}
              className="py-3 px-2 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer text-foreground/95 hover:text-foreground text-xs font-medium"
            >
              Subtitle
            </button>
            <button
              onClick={() => handleAddText("title")}
              className="py-3 px-2 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer text-foreground text-sm font-bold"
            >
              Title
            </button>
          </div>
        </div>

        {/* 2. Basic Section */}
        <div className="bg-card border border-border/40 p-3.5 rounded-xl flex flex-col gap-2.5 shadow-sm">
          <span className="text-[12px] font-semibold text-foreground font-sans">Basic</span>
          <div className="grid grid-cols-4 gap-2">
            {/* Outline Triangle */}
            <button
              onClick={() => handleAddShape("Triangle")}
              className="aspect-square bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer group/btn"
            >
              <svg
                className="size-5 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <polygon points="12,3 2,21 22,21" />
              </svg>
            </button>
            {/* Outline Circle */}
            <button
              onClick={() => handleAddShape("Circle", 100)}
              className="aspect-square bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer group/btn"
            >
              <svg
                className="size-5 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <circle cx="12" cy="12" r="8" />
              </svg>
            </button>
            {/* Outline Square */}
            <button
              onClick={() => handleAddShape("Square")}
              className="aspect-square bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer group/btn"
            >
              <svg
                className="size-5 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
            {/* Outline Star */}
            <button
              onClick={() => handleAddShape("Star")}
              className="aspect-square bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer group/btn"
            >
              <svg
                className="size-5 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
              </svg>
            </button>
            {/* Filled Triangle */}
            <button
              onClick={() => handleAddShape("Triangle")}
              className="aspect-square bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer group/btn"
            >
              <svg
                className="size-5 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="12,3 2,21 22,21" />
              </svg>
            </button>
            {/* Filled Circle */}
            <button
              onClick={() => handleAddShape("Circle", 100)}
              className="aspect-square bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer group/btn"
            >
              <svg
                className="size-5 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="8" />
              </svg>
            </button>
            {/* Filled Square */}
            <button
              onClick={() => handleAddShape("Square")}
              className="aspect-square bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer group/btn"
            >
              <svg
                className="size-5 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
            {/* Filled Star */}
            <button
              onClick={() => handleAddShape("Star")}
              className="aspect-square bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer group/btn"
            >
              <svg
                className="size-5 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
              </svg>
            </button>
            {/* Arrow */}
            <button
              onClick={() => handleAddShape("Arrow")}
              className="aspect-square bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer group/btn"
            >
              <svg
                className="size-5 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </button>
            {/* Line */}
            <button
              onClick={() => handleAddShape("Line")}
              className="aspect-square bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex items-center justify-center transition-all duration-200 cursor-pointer group/btn"
            >
              <svg
                className="size-5 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <line x1="4" y1="20" x2="20" y2="4" />
              </svg>
            </button>
          </div>
        </div>

        {/* 3. Placeholder Section */}
        <div className="bg-card border border-border/40 p-3.5 rounded-xl flex flex-col gap-2.5 shadow-sm">
          <span className="text-[12px] font-semibold text-foreground font-sans">Placeholder</span>
          <div className="grid grid-cols-3 gap-2">
            <button className="py-2.5 px-2 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium transition-colors">
                Media
              </span>
            </button>
            <button className="py-2.5 px-2 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium transition-colors">
                Screen
              </span>
            </button>
            <button className="py-2.5 px-2 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium transition-colors">
                Camera
              </span>
            </button>
          </div>
        </div>

        {/* 4. Dynamic text Section */}
        <div className="bg-card border border-border/40 p-3.5 rounded-xl flex flex-col gap-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-foreground font-sans">
              Dynamic text
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-0.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus:outline-none">
                    <IconInfoCircle className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-popover border border-border text-foreground p-2 rounded-lg text-xs max-w-[200px]">
                  Dynamic text elements update automatically during playback.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button className="py-2 px-1 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium truncate w-full text-center px-0.5 transition-colors">
                Timer
              </span>
            </button>
            <button className="py-2 px-1 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium truncate w-full text-center px-0.5 transition-colors">
                Composi...
              </span>
            </button>
            <button className="py-2 px-1 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium truncate w-full text-center px-0.5 transition-colors">
                Marker
              </span>
            </button>
            <button className="py-2 px-1 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M19 12c0 2.21-1.79 4-4 4h-3v-8h3c2.21 0 4 1.79 4 4zM12 8H9L5 12l4 4h3V8z" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium truncate w-full text-center px-0.5 transition-colors">
                Speaker
              </span>
            </button>
          </div>
        </div>

        {/* 5. Waveforms Section */}
        <div className="bg-card border border-border/40 p-3.5 rounded-xl flex flex-col gap-2.5 shadow-sm">
          <span className="text-[12px] font-semibold text-foreground font-sans">Waveforms</span>
          <div className="grid grid-cols-4 gap-2">
            <button className="py-2 px-1 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M4 10v4M8 6v12M12 8v8M16 4v16M20 10v4" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium truncate w-full text-center px-0.5 transition-colors">
                Lines
              </span>
            </button>
            <button className="py-2 px-1 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <circle cx="12" cy="12" r="8" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium truncate w-full text-center px-0.5 transition-colors">
                Circle
              </span>
            </button>
            <button className="py-2 px-1 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <circle cx="10" cy="12" r="5" />
                <circle cx="14" cy="12" r="5" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium truncate w-full text-center px-0.5 transition-colors">
                Rings
              </span>
            </button>
            <button className="py-2 px-1 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M3 12c3-6 3 6 6 0s3-6 6 0 3 6 6 0" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium truncate w-full text-center px-0.5 transition-colors">
                Wave
              </span>
            </button>
          </div>
        </div>

        {/* 6. Playback progress Section */}
        <div className="bg-card border border-border/40 p-3.5 rounded-xl flex flex-col gap-2.5 shadow-sm">
          <span className="text-[12px] font-semibold text-foreground font-sans">
            Playback progress
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button className="py-2.5 px-2 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <rect x="3" y="10" width="18" height="4" rx="2" />
                <rect x="3" y="10" width="10" height="4" rx="2" fill="currentColor" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium transition-colors">
                Bar
              </span>
            </button>
            <button className="py-2.5 px-2 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <circle cx="12" cy="12" r="8" strokeDasharray="25 8" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium transition-colors">
                Spinner
              </span>
            </button>
            <button className="py-2.5 px-2 bg-secondary/35 hover:bg-secondary/60 border border-border/40 hover:border-border/80 rounded-md flex flex-col items-center gap-1.5 transition-all duration-200 cursor-pointer group/btn">
              <svg
                className="size-4 text-muted-foreground group-hover/btn:text-foreground transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M12 2v10h10C22 6.48 17.52 2 12 2z" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              <span className="text-[10px] text-muted-foreground group-hover/btn:text-foreground font-sans font-medium transition-colors">
                Pie
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
