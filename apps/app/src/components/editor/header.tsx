"use client";

import { useState, useEffect } from "react";
import { useProjectStore } from "@/stores/project-store";
import { usePanelStore } from "@/stores/panel-store";
import { Button } from "@/components/ui/button";
import { LogoIcons } from "@/components/shared/logos";
import { ExportModal } from "./export-modal";
import { Sidebar } from "@phosphor-icons/react";
import { LockSimpleIcon, CaretDownIcon } from "@phosphor-icons/react";

export default function Header() {
  const { projectName } = useProjectStore();
  const { isCopilotVisible, toggleCopilot } = usePanelStore();
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Global keydown listener for Export (Ctrl+E / Cmd+E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setIsExportOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="h-13 border-b shrink-0">
      <div className="h-full grid grid-cols-3 items-center px-4">
        {/* Left Column: Logo & App Name */}
        <div className="flex items-center justify-start gap-1.5 select-none">
          <LogoIcons.scenify className="size-5 text-foreground" />
          <span className="text-sm font-semibold lowercase">openvideo</span>
        </div>

        {/* Center Column: Project Space & Details */}
        <div className="flex items-center justify-center gap-1.5 text-sm font-semibold">
          <LockSimpleIcon size={14} className=" shrink-0" />
          <span className=" font-medium">Personal</span>
          <span className="font-light px-1">/</span>
          <span className="text-foreground truncate max-w-[200px]">
            {projectName || "Untitled video"}
          </span>
          <CaretDownIcon size={12} className="shrink-0 ml-0.5" />
        </div>

        {/* Right Column: Aspect Ratio and Export Button */}
        <div className="flex items-center justify-end gap-2">
          {/* Export Button */}
          <Button
            onClick={() => setIsExportOpen(true)}
            className="h-7 text-xs font-semibold px-3 bg-foreground text-background hover:bg-foreground/90 rounded-md flex items-center gap-2"
          >
            <span>Export</span>
          </Button>

          {!isCopilotVisible && (
            <Button
              onClick={toggleCopilot}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <Sidebar className="size-4" />
              <span className="sr-only">Open assistant</span>
            </Button>
          )}
        </div>
      </div>

      {/* Export Modal managed locally in Header */}
      <ExportModal open={isExportOpen} onOpenChange={setIsExportOpen} />
    </div>
  );
}
