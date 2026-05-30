"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGeneratedStore } from "@/stores/generated-store";
import { storageService } from "@/lib/storage/storage-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  IconLoader2,
  IconVideo,
  IconPhoto,
  IconUser,
  IconMicrophone,
  IconMusic,
  IconWaveSine,
  IconSparkles,
  IconSettings,
  IconDeviceMobile,
  IconUpload,
} from "@tabler/icons-react";

export type GenerateAssetType = "video" | "image" | "lip-sync" | "voiceover" | "music" | "sfx";

interface AssetTypeOption {
  id: GenerateAssetType;
  label: string;
  icon: React.FC<{ className?: string; size?: number; stroke?: number }>;
  placeholder: string;
}

const ASSET_TYPES: AssetTypeOption[] = [
  {
    id: "video",
    label: "Video",
    icon: IconVideo,
    placeholder: "Describe your video idea...",
  },
  {
    id: "image",
    label: "Image",
    icon: IconPhoto,
    placeholder: "Describe the image you want...",
  },
  {
    id: "lip-sync",
    label: "Lip Sync",
    icon: IconUser,
    placeholder: "Character and dialogue for lip sync...",
  },
  {
    id: "voiceover",
    label: "Voiceover",
    icon: IconMicrophone,
    placeholder: "Text to convert to voiceover...",
  },
  {
    id: "music",
    label: "Music",
    icon: IconMusic,
    placeholder: "Music mood or style...",
  },
  {
    id: "sfx",
    label: "SFX",
    icon: IconWaveSine,
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

  const currentTypeOption = ASSET_TYPES.find((t) => t.id === selectedType)!;
  const CurrentIcon = currentTypeOption.icon;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (!prompt.trim() && !loading) {
          setIsExpanded(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [prompt, loading]);

  const handleSurpriseMe = () => {
    const randomIndex = Math.floor(Math.random() * SURPRISE_PROMPTS.length);
    setPrompt(SURPRISE_PROMPTS[randomIndex]);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      // Mock generation for demo
      await new Promise((r) => setTimeout(r, 2000));
      toast.success(`${currentTypeOption.label} generated!`);
      setPrompt("");
      setIsExpanded(false);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to generate`);
    } finally {
      setLoading(false);
    }
  };

  // Collapsed state - minimal input bar
  if (!isExpanded) {
    return (
      <div
        ref={containerRef}
        className={cn("shrink-0 bg-card p-3 cursor-pointer", !floating && "border-t border-border")}
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary/50 border border-border/60 rounded-xl hover:bg-secondary/70 hover:border-border transition-all">
          <IconSparkles className="size-4 text-primary shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">
            Describe what you want to create
          </span>
          <IconUpload
            className="size-4 text-muted-foreground hover:text-foreground shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onUploadClick();
            }}
          />
        </div>
      </div>
    );
  }

  // Expanded state - full interface
  return (
    <div
      ref={containerRef}
      className={cn(
        "shrink-0 bg-secondary/30 p-4 animate-in slide-in-from-bottom-2 duration-200",
        !floating && "border-t border-border",
      )}
    >
      {/* Text Input */}
      <div className="relative bg-secondary/30 rounded-xl border border-border/50 p-3 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/20 transition-all mb-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={currentTypeOption.placeholder}
          className="w-full min-h-[80px] bg-transparent resize-none focus:outline-none text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60"
          autoFocus
        />
        {!prompt && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="text-xs text-muted-foreground/60">Press Enter to generate</span>
            <button
              onClick={handleSurpriseMe}
              className="text-xs text-primary font-medium pointer-events-auto"
            >
              Surprise me
            </button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {/* Left - Type selector then Settings */}
        <div className="flex items-center gap-1.5">
          {/* Type Selector - now at bottom left */}
          <Popover open={typeOpen} onOpenChange={setTypeOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-foreground bg-secondary/50 hover:bg-secondary rounded-lg border border-border/50 transition-colors">
                <CurrentIcon className="size-3.5" stroke={1.5} />
                <span>{currentTypeOption.label}</span>
              </button>
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
                    <OptionIcon className="size-3.5" stroke={1.5} />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          {/* Model */}
          <Popover open={modelOpen} onOpenChange={setModelOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                <IconSettings className="size-3.5" stroke={1.5} />
                <span className="hidden sm:inline">{selectedModel}</span>
              </button>
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

          {/* Ratio */}
          {["video", "image"].includes(selectedType) && (
            <Popover open={ratioOpen} onOpenChange={setRatioOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                  <IconDeviceMobile className="size-3.5" stroke={1.5} />
                  <span>{selectedRatio}</span>
                </button>
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

          {/* Duration */}
          {["video", "music", "voiceover", "sfx"].includes(selectedType) && (
            <Popover open={durationOpen} onOpenChange={setDurationOpen}>
              <PopoverTrigger asChild>
                <button className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                  {selectedDuration}s
                </button>
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
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-1 hover:text-foreground transition-colors"
              >
                −
              </button>
              <span className="w-4 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(4, q + 1))}
                className="p-1 hover:text-foreground transition-colors"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setPrompt("");
              setIsExpanded(false);
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
          >
            {loading ? <IconLoader2 className="size-4 animate-spin" /> : "Generate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
