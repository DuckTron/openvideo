"use client";

import { cn } from "@/lib/utils";
import { type Tab, tabs, useMediaPanelStore } from "./store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconMenu, IconPlus, IconCopy, IconMenu2 } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/stores/project-store";
import { trpc } from "@/lib/trpc";
import { core } from "@/lib/project";
import { toast } from "sonner";
import { LogoIcons } from "@/components/shared/logos";
import { useStudioStore } from "@/stores/studio-store";

export function TabBar() {
  const { activeTab, setActiveTab, isOpen, setIsOpen } = useMediaPanelStore();
  const { selectedClips, setSelectedClips } = useStudioStore();
  const hasSelection = selectedClips.length > 0;
  const router = useRouter();
  const { projectName, canvasSize, fps } = useProjectStore();

  const createProjectMutation = trpc.space.create.useMutation();

  const handleCreateNewProject = () => {
    toast.promise(
      createProjectMutation.mutateAsync({
        name: "Untitled video",
        width: 1080,
        height: 1920,
        fps: 30,
        scene: { tracks: [], clips: {}, settings: {} },
      }),
      {
        loading: "Creating project...",
        success: (newProject) => {
          router.push(`/edit/${newProject.id}`);
          return "Project created successfully!";
        },
        error: "Failed to create project",
      },
    );
  };

  const handleDuplicateProject = () => {
    const sceneJson = core.project.export();
    toast.promise(
      createProjectMutation.mutateAsync({
        name: `${projectName} (Copy)`,
        width: canvasSize.width,
        height: canvasSize.height,
        fps: fps,
        scene: sceneJson,
      }),
      {
        loading: "Duplicating project...",
        success: (newProject) => {
          router.push(`/edit/${newProject.id}`);
          return "Project duplicated successfully!";
        },
        error: "Failed to duplicate project",
      },
    );
  };

  return (
    <div className="relative flex flex-col items-center pr-1 gap-3 h-full bg-background shrink-0 ">
      {/* Tabs list */}
      <div className="flex flex-col items-center py-2 px-2 gap-2.5 bg-card/70 h-full">
        {(Object.keys(tabs) as Tab[]).map((tabKey) => {
          const tab = tabs[tabKey];
          const isActive = activeTab === tabKey && isOpen && !hasSelection;
          return (
            <div
              className={cn(
                "flex flex-col items-center justify-center flex-none cursor-pointer rounded-sm transition-all duration-200 w-full py-1.5 px-0.5 gap-2",
                isActive
                  ? "bg-white/10 text-white font-semibold"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white",
              )}
              onClick={() => {
                if (hasSelection) {
                  setSelectedClips([]);
                  setActiveTab(tabKey);
                  setIsOpen(true);
                } else if (activeTab === tabKey && isOpen) {
                  setIsOpen(false);
                } else {
                  setActiveTab(tabKey);
                }
              }}
              key={tabKey}
            >
              <Tooltip delayDuration={10}>
                <TooltipTrigger asChild>
                  <tab.icon className="size-[18px]" />
                </TooltipTrigger>
                <TooltipContent side="right" align="center" sideOffset={8}>
                  {tab.label}
                </TooltipContent>
              </Tooltip>
              <span className="text-[12px] leading-none mt-0.5 select-none text-center truncate max-w-full px-0.5">
                {tab.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
