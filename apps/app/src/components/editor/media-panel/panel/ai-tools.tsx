"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  IconSparkles,
  IconChevronRight,
  IconX,
  IconPencil,
  IconMicrophone,
  IconRefresh,
  IconBookmark,
  IconWand,
  IconEye,
  IconLayoutGrid,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface AIToolItem {
  id: string;
  name: string;
  description?: string;
  icon: React.FC<any>;
}

export default function PanelAITools() {
  const [showRecommended, setShowRecommended] = useState(true);

  const recommendedTools: AIToolItem[] = [
    {
      id: "clarity",
      name: "Edit for clarity",
      description: "Remove filler words, digressions, blather — all the obvious cuts",
      icon: IconPencil,
    },
    {
      id: "filler",
      name: "Remove filler words",
      description: "Remove uhms, uhs, repeated words, and other verbal clutter",
      icon: () => (
        <span className="text-[10px] font-bold leading-none select-none tracking-tighter">UHM</span>
      ),
    },
    {
      id: "gaps",
      name: "Shorten word gaps",
      description: "Shrink or cut silences & lapses in conversation",
      icon: () => (
        <div className="flex items-center gap-0.5 opacity-80 h-3">
          <span className="w-[1.5px] h-2 bg-foreground rounded-full" />
          <span className="w-[1.5px] h-3.5 bg-foreground rounded-full opacity-40" />
          <span className="w-[1.5px] h-3.5 bg-foreground rounded-full opacity-40" />
          <span className="w-[1.5px] h-2 bg-foreground rounded-full" />
        </div>
      ),
    },
    {
      id: "sound",
      name: "Studio Sound",
      description: "Remove background noise & enhance voices",
      icon: IconMicrophone,
    },
    {
      id: "clips",
      name: "Create clips",
      description: "AI Tools picks your most viral-worthy moments & creates clips that pop",
      icon: IconLayoutGrid,
    },
  ];

  const soundGoodTools: AIToolItem[] = [
    { id: "clarity-sg", name: "Edit for clarity", icon: IconPencil },
    { id: "sound-sg", name: "Studio Sound", icon: IconMicrophone },
    {
      id: "filler-sg",
      name: "Remove filler words",
      icon: () => (
        <span className="text-[9px] font-bold leading-none select-none tracking-tighter">UHM</span>
      ),
    },
    { id: "retakes-sg", name: "Remove retakes", icon: IconRefresh },
    {
      id: "gaps-sg",
      name: "Shorten word gaps",
      icon: () => (
        <div className="flex items-center gap-0.5 opacity-80 h-3">
          <span className="w-[1.5px] h-1.5 bg-foreground rounded-full" />
          <span className="w-[1.5px] h-2.5 bg-foreground rounded-full opacity-40" />
          <span className="w-[1.5px] h-2.5 bg-foreground rounded-full opacity-40" />
          <span className="w-[1.5px] h-1.5 bg-foreground rounded-full" />
        </div>
      ),
    },
    { id: "chapters-sg", name: "Add chapters", icon: IconBookmark },
  ];

  const lookGoodTools: AIToolItem[] = [
    { id: "design", name: "Quick design", icon: IconWand },
    { id: "eye", name: "Eye Contact", icon: IconEye },
  ];

  return (
    <div className="h-full flex flex-col relative bg-background p-2 gap-4 overflow-hidden select-none">
      {/* Header Row */}
      <div className="flex items-center gap-2 text-sm font-medium text-foreground shrink-0 px-2 pt-1">
        <IconSparkles className="size-4.5 text-foreground/85" />
        <span>AI Tools</span>
      </div>

      <ScrollArea className="flex-1 pr-1.5">
        <div className="flex flex-col gap-3 pb-6">
          <div className="group relative bg-card border border-border/40 hover:border-border/80 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute -top-10 -left-10 w-32 h-24 rounded-full bg-indigo-500/15 blur-[30px] group-hover:translate-x-4 group-hover:translate-y-2 transition-all duration-700 ease-out z-0" />
            <div className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full bg-violet-500/15 blur-[30px] group-hover:-translate-x-4 group-hover:-translate-y-2 transition-all duration-700 ease-out z-0" />
            <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-16 h-8 rounded-full bg-sky-500/10 blur-[20px] group-hover:scale-125 transition-all duration-700 ease-out z-0" />

            {/* Glass Shine reflection sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out z-0" />

            <div className="flex-1 pr-4 relative z-10">
              <h4 className="text-xs font-semibold text-foreground mb-1 leading-tight">
                Improve this video
              </h4>
              <p className="text-[10px] text-muted-foreground leading-snug">
                Let Director plan your edits with smart suggestions
              </p>
            </div>
            <IconChevronRight className="size-4 text-muted-foreground/60 group-hover:text-foreground transition-colors shrink-0 relative z-10" />
          </div>

          {/* Recommended Section Card */}
          {showRecommended && (
            <div className="bg-card border border-border/40 p-3.5 rounded-xl flex flex-col gap-2.5 shadow-sm">
              <div className="flex items-center justify-between shrink-0 mb-1">
                <span className="text-[12px] font-semibold text-foreground font-sans">
                  Recommended
                </span>
                <button
                  onClick={() => setShowRecommended(false)}
                  className="p-1 hover:bg-accent/40 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <IconX className="size-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {recommendedTools.map((tool) => {
                  const ToolIcon = tool.icon;
                  return (
                    <div
                      key={tool.id}
                      className="group flex items-start gap-3 py-2 rounded-md hover:bg-accent/40 cursor-pointer transition-colors duration-200"
                    >
                      <div className="size-7 rounded-md bg-secondary/35 border border-border/40 flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                        <ToolIcon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-semibold text-foreground/90 leading-tight group-hover:text-foreground mb-1">
                          {tool.name}
                        </h5>
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sound good Section */}
          <div className="bg-card border border-border/40 p-3.5 rounded-xl flex flex-col gap-2.5 shadow-sm">
            <div className="mb-1">
              <span className="text-[12px] font-semibold text-foreground font-sans">
                Sound good
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {soundGoodTools.map((tool) => {
                const ToolIcon = tool.icon;
                return (
                  <div
                    key={tool.id}
                    className="group flex items-center gap-3 py-1.5 rounded-md hover:bg-accent/40 cursor-pointer transition-colors duration-200"
                  >
                    <div className="size-6.5 rounded-md bg-secondary/35 border border-border/40 flex items-center justify-center shrink-0 group-hover:text-foreground transition-colors">
                      <ToolIcon className="size-3.5" />
                    </div>
                    <span className="text-xs font-medium group-hover:text-foreground transition-colors truncate">
                      {tool.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Look good Section */}
          <div className="bg-card border border-border/40 p-3.5 rounded-xl flex flex-col gap-2.5 shadow-sm">
            <div className="mb-1">
              <span className="text-[12px] font-semibold text-foreground font-sans">Look good</span>
            </div>
            <div className="flex flex-col gap-1">
              {lookGoodTools.map((tool) => {
                const ToolIcon = tool.icon;
                return (
                  <div
                    key={tool.id}
                    className="group flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-accent/40 cursor-pointer transition-colors duration-200"
                  >
                    <div className="size-6.5 rounded-md bg-secondary/35 border border-border/40 flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                      <ToolIcon className="size-3.5" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate">
                      {tool.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
