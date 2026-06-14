"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGeneratedStore } from "@/stores/generated-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowUp,
  CaretDown,
  Clock,
  DeviceMobile,
  Gear,
  Image,
  Microphone,
  MusicNote,
  Sparkle,
  Upload,
  User,
  VideoCamera,
  Waveform,
} from "@phosphor-icons/react";

export type GenerateAssetType = "video" | "image" | "lip-sync" | "voiceover" | "music" | "sfx";

interface AssetTypeOption {
  id: GenerateAssetType;
  label: string;
  icon: React.ComponentType<any>;
  placeholder: string;
}

const ASSET_TYPES: AssetTypeOption[] = [
  {
    id: "video",
    label: "Video",
    icon: VideoCamera,
    placeholder: "Describe your video idea...",
  },
  {
    id: "image",
    label: "Image",
    icon: Image,
    placeholder: "Describe the image you want...",
  },
  {
    id: "lip-sync",
    label: "Lip Sync",
    icon: User,
    placeholder: "Character and dialogue for lip sync...",
  },
  {
    id: "voiceover",
    label: "Voiceover",
    icon: Microphone,
    placeholder: "Text to convert to voiceover...",
  },
  {
    id: "music",
    label: "Music",
    icon: MusicNote,
    placeholder: "Music mood or style...",
  },
  {
    id: "sfx",
    label: "SFX",
    icon: Waveform,
    placeholder: "Describe the sound effect...",
  },
];

const RATIOS = ["1:1", "16:9", "9:16"];
const DURATIONS = [5, 10, 15, 30, 60];
const MODELS = ["Nano Banana 2", "Nano Banana Turbo", "Standard Model 1"];

const SURPRISE_PROMPTS = [
  "Sunlight filtering through trees and a gentle stream flowing",
  "A futuristic cyberpunk street lined with glowing neon signs at midnight",
  "A majestic dragon perched on a misty mountain peak during sunset",
  "A cozy library with a fireplace burning and rain pattering on the window",
  "An astronaut floating in deep space, looking at a beautiful distant galaxy",
  "A cute baby panda playing in a bamboo forest, stylized 3D render",
];

interface AssetGeneratorExpandableProps {
  onUploadClick: () => void;
  isUploading: boolean;
  floating?: boolean;
}

export function AssetGeneratorExpandable({
  onUploadClick,
  isUploading,
  floating = false,
}: AssetGeneratorExpandableProps) {
  const { addAsset } = useGeneratedStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState<GenerateAssetType>("image");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Nano Banana 2");
  const [selectedRatio, setSelectedRatio] = useState("1:1");
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [quantity, setQuantity] = useState(1);

  const [typeOpen, setTypeOpen] = useState(false);
  const [ratioOpen, setRatioOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [quantityOpen, setQuantityOpen] = useState(false);

  const currentTypeOption = ASSET_TYPES.find((t) => t.id === selectedType)!;
  const CurrentIcon = currentTypeOption.icon;

  // Check if any popover is open
  const anyPopoverOpen = typeOpen || modelOpen || ratioOpen || durationOpen || quantityOpen;

  // Close when clicking outside (but not when popovers are open)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (anyPopoverOpen) return;
        if (!prompt.trim() && !loading) {
          setIsExpanded(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [prompt, loading, anyPopoverOpen]);

  const handleSurpriseMe = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * SURPRISE_PROMPTS.length);
    setPrompt(SURPRISE_PROMPTS[randomIndex]);
  }, []);

  const handleCancel = useCallback(() => {
    setPrompt("");
    setIsExpanded(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 2000));
      toast.success(`${currentTypeOption.label} generated successfully`);
      setPrompt("");
      setIsExpanded(false);
    } catch (error) {
      toast.error("Failed to generate asset");
    } finally {
      setLoading(false);
    }
  }, [prompt, currentTypeOption.label]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleGenerate();
      }
      if (e.key === "Escape" && !anyPopoverOpen) {
        e.preventDefault();
        handleCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, handleGenerate, handleCancel, anyPopoverOpen]);

  // Collapsed state - minimal input bar
  if (!isExpanded) {
    return (
      <div
        ref={containerRef}
        className={cn("shrink-0 bg-card p-3", !floating && "border-t border-border")}
      >
        <div className="flex w-full items-center gap-2 rounded-xl border border-border/60 bg-secondary/50 px-3 py-2 transition-all hover:border-primary/30 hover:bg-secondary">
          <button
            onClick={() => setIsExpanded(true)}
            className="group flex flex-1 items-center gap-3 text-left"
          >
            <div className="relative">
              <Sparkle className="size-4 shrink-0 text-primary transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 size-4 animate-pulse rounded-full bg-primary/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Describe what you want to create...
            </span>
          </button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs border-border/60 bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/30"
            onClick={onUploadClick}
          >
            <Upload className="size-3.5" />
            <span>Upload</span>
          </Button>
        </div>
      </div>
    );
  }

  // Expanded state - full interface
  return (
    <div
      ref={containerRef}
      className={cn(
        "shrink-0 bg-secondary/30 p-4 animate-in slide-in-from-bottom-2 duration-200 border",
      )}
    >
      {/* Text Input */}
      <div className="relative mb-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={currentTypeOption.placeholder}
          className={cn(
            "w-full min-h-[100px] resize-none rounded-xl border bg-transparent p-3.5 text-sm",
            "border-border/50 bg-secondary/30 placeholder:text-muted-foreground/50",
            "focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/10",
            "transition-all",
          )}
          autoFocus
        />
        {/* Character count & hint */}
        <div className="absolute bottom-2 right-2 flex items-center gap-2 text-[10px] text-muted-foreground/60">
          {prompt.length > 0 && <span className="tabular-nums">{prompt.length}</span>}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {/* Left - Type selector then Settings */}
        <div className="flex items-center gap-1.5">
          {/* Type Selector - icon with chevron */}
          <Popover open={typeOpen} onOpenChange={setTypeOpen}>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm" className="h-8 gap-1 px-2 text-xs">
                <CurrentIcon className="size-3.5" />
                <CaretDown className="size-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="p-1.5 w-44 bg-popover border border-border shadow-lg rounded-xl text-popover-foreground"
            >
              {ASSET_TYPES.map((option) => {
                const isSelected = selectedType === option.id;
                const OptionIcon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSelectedType(option.id);
                      setTypeOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                    )}
                  >
                    <OptionIcon className="size-3.5" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          {/* Model - icon with chevron */}
          <Popover open={modelOpen} onOpenChange={setModelOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
                <Gear className="size-3.5" />
                <CaretDown className="size-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="p-1.5 w-40 bg-popover border border-border shadow-lg rounded-xl text-xs"
            >
              {MODELS.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setSelectedModel(m);
                    setModelOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center px-2.5 py-2 rounded-lg transition-colors text-left",
                    selectedModel === m
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Ratio - icon with chevron */}
          {["video", "image"].includes(selectedType) && (
            <Popover open={ratioOpen} onOpenChange={setRatioOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
                  <DeviceMobile className="size-3.5" />
                  <CaretDown className="size-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                className="p-1.5 w-20 bg-popover border border-border shadow-lg rounded-xl text-xs"
              >
                {RATIOS.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setSelectedRatio(r);
                      setRatioOpen(false);
                    }}
                    className={cn(
                      "w-full px-2.5 py-2 rounded-lg transition-colors text-center",
                      selectedRatio === r
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}

          {/* Duration - icon with chevron */}
          {["video", "music", "voiceover", "sfx"].includes(selectedType) && (
            <Popover open={durationOpen} onOpenChange={setDurationOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
                  <Clock className="size-3.5" />
                  <CaretDown className="size-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                className="p-1.5 w-20 bg-popover border border-border shadow-lg rounded-xl text-xs"
              >
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setSelectedDuration(d);
                      setDurationOpen(false);
                    }}
                    className={cn(
                      "w-full px-2.5 py-2 rounded-lg transition-colors text-center",
                      selectedDuration === d
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                    )}
                  >
                    {d}s
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}

          {/* Quantity for images */}
          {selectedType === "image" && (
            <Popover open={quantityOpen} onOpenChange={setQuantityOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
                  <span className="font-medium text-foreground">{quantity}</span>
                  <CaretDown className="size-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                className="p-1.5 w-16 bg-popover border border-border shadow-lg rounded-xl text-xs"
              >
                {[1, 2, 3, 4].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setQuantity(q);
                      setQuantityOpen(false);
                    }}
                    className={cn(
                      "w-full px-2.5 py-2 rounded-lg transition-colors text-center",
                      quantity === q
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                    )}
                  >
                    {q}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            className="size-6 rounded-full ml-auto bg-foreground hover:bg-foreground/90 text-background"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
          >
            {/* {loading ? <IconLoader2 className="size-4 animate-spin" /> : "Generate"} */}

            <ArrowUp className="w-4 h-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
