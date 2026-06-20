"use client";

import { useState, useEffect } from "react";
import { useProjectStore } from "@/stores/project-store";
import { usePanelStore } from "@/stores/panel-store";
import { Button } from "@/components/ui/button";
import { LogoIcons } from "@/components/shared/logos";
import { ExportPopover } from "./export-popover";
import { TaskbarPopover } from "./taskbar-popover";
import {
  RiArchiveDrawerLine,
  RiDownloadLine,
  RiNotification3Line,
  RiNotificationBadgeLine,
  RiSideBarLine,
} from "@remixicon/react";
import { RiLockLine, RiArrowDownSLine } from "@remixicon/react";
import { core } from "@/lib/project";

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
        <div
          className="flex items-center justify-start gap-1.5 select-none"
          onClick={() => console.log(core.project.export())}
        >
          <LogoIcons.scenify className="size-5 text-foreground" />
          <span className="text-sm font-heading font-bold leading-5 lowercase">openvideo</span>
        </div>

        {/* Center Column: Project Space & Details */}
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
          <RiLockLine size={14} className=" shrink-0" />
          <span className=" font-medium">Personal</span>
          <span className="px-1">/</span>
          <span className="text-foreground truncate max-w-[200px]">
            {projectName || "Untitled video"}
          </span>
          <RiArrowDownSLine size={12} className="shrink-0 ml-0.5" />
        </div>

        {/* Right Column: Aspect Ratio and Export Button */}
        <div className="flex items-center justify-end gap-2">
          {/* Taskbar Button */}
          <TaskbarPopover>
            <RiArchiveDrawerLine className="size-4" />
            <span className="sr-only">Tasks</span>
          </TaskbarPopover>

          {/* Export Button */}
          <ExportPopover open={isExportOpen} onOpenChange={setIsExportOpen}>
            <Button className="h-7 text-xs font-semibold px-3 rounded-md flex items-center gap-2">
              <span>Export</span>
            </Button>
          </ExportPopover>

          {!isCopilotVisible && (
            <Button
              onClick={toggleCopilot}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <RiSideBarLine className="size-4" />
              <span className="sr-only">Open assistant</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
