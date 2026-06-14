"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { MediaPanel } from "@/components/editor/media-panel";
import { CanvasPanel } from "@/components/editor/canvas-panel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import Timeline from "@/components/editor/timeline";
import { usePanelStore } from "@/stores/panel-store";
import { Loading } from "@/components/editor/loading";
import FloatingControl from "@/components/editor/floating-controls/floating-control";
import { Compositor } from "@openvideo/engine-pixi";
import { WebCodecsUnsupportedModal } from "@/components/editor/webcodecs-unsupported-modal";
import Assistant from "./assistant/assistant";
import { core } from "@/lib/project";
import { IProject } from "@openvideo/core";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/project-store";
import { LogoIcons } from "@/components/shared/logos";
import {
  IconCloud,
  IconDeviceMobile,
  IconDeviceTv,
  IconSquare,
  IconAspectRatio,
  IconChevronDown,
  IconLayoutSidebarRightExpand,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ExportModal } from "./export-modal";

export default function Editor({
  initialDesign,
}: {
  isDataLoading?: boolean;
  initialDesign?: IProject;
}) {
  const params = useParams();
  const projectId = params?.projectId as string;

  const setProjectId = useProjectStore((state) => state.setProjectId);
  const setSpaceId = useProjectStore((state) => state.setSpaceId);
  const setProjectName = useProjectStore((state) => state.setProjectName);
  const resetProject = useProjectStore((state) => state.resetProject);
  const projectName = useProjectStore((state) => state.projectName);
  const aspectRatio = useProjectStore((state) => state.aspectRatio);
  const setCanvasSize = useProjectStore((state) => state.setCanvasSize);

  const [isExportOpen, setIsExportOpen] = useState(false);

  const {
    toolsPanel,
    copilotPanel,
    mainContent,
    timeline,
    setToolsPanel,
    setCopilotPanel,
    setMainContent,
    setTimeline,
    editorMode,
    isCopilotVisible,
    toggleCopilot,
  } = usePanelStore();

  const [isReady, setIsReady] = useState(false);
  const [isWebCodecsSupported, setIsWebCodecsSupported] = useState(true);

  // useEffect(() => {
  //   setTimeout(() => {
  //     core.project.import(data);
  //   }, 1000);
  // }, []);

  // tRPC query for project data
  const { data: projectData } = trpc.space.getById.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );

  // Reset store + canvas engine on every route entry / project switch
  useEffect(() => {
    resetProject();
    core.project.new();
  }, [projectId]); // intentionally only depends on projectId — runs on mount and when switching projects

  useEffect(() => {
    if (!projectId) return;
    setProjectId(projectId);
  }, [projectId, setProjectId]);

  useEffect(() => {
    if (projectData) {
      setSpaceId(projectData.id);
      if (projectData.name) {
        setProjectName(projectData.name);
      }
    }
  }, [projectData, setSpaceId, setProjectName]);

  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = await Compositor.isSupported();
      setIsWebCodecsSupported(isSupported);
    };
    checkSupport();
  }, []);

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

  // Clear loading screen for non-editor modes (CanvasPanel doesn't mount, onReady never fires)
  useEffect(() => {
    if (editorMode !== "editor") {
      setIsReady(true);
    }
  }, [editorMode]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {!isReady && (
        <div className="absolute inset-0 z-100">
          <Loading />
        </div>
      )}
      <div className="flex-1 min-h-0 min-w-0">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-0">
          {/* Left Area (Canvas, MediaPanel, Timeline) */}
          <ResizablePanel
            defaultSize={100 - (isCopilotVisible ? copilotPanel : 0)}
            minSize={60}
            className="min-h-0 min-w-0"
          >
            <ResizablePanelGroup direction="vertical" className="h-full w-full gap-0">
              <div className="h-13 pb-1 shrink-0">
                <div className="h-full bg-card/70 grid grid-cols-3 items-center px-4">
                  {/* Left Column: Logo & App Name */}
                  <div className="flex items-center justify-start gap-1.5 select-none">
                    <LogoIcons.scenify className="size-5 text-foreground" />
                    <span className="text-sm font-semibold tracking-wide lowercase">openvideo</span>
                  </div>

                  {/* Center Column: Cloud & Project Name */}
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <IconCloud className="size-4 shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate max-w-[150px]">
                      {projectName || "Untitled video"}
                    </span>
                  </div>

                  {/* Right Column: Aspect Ratio and Export Button */}
                  <div className="flex items-center justify-end gap-2">
                    {/* Aspect Ratio Selector */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium px-2.5"
                        >
                          {aspectRatio === "9:16" && <IconDeviceMobile className="size-3.5" />}
                          {aspectRatio === "16:9" && <IconDeviceTv className="size-3.5" />}
                          {aspectRatio === "1:1" && <IconSquare className="size-3.5" />}
                          {aspectRatio !== "9:16" &&
                            aspectRatio !== "16:9" &&
                            aspectRatio !== "1:1" && <IconAspectRatio className="size-3.5" />}
                          <span>{aspectRatio}</span>
                          <IconChevronDown className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => setCanvasSize({ width: 1920, height: 1080 }, "16:9")}
                        >
                          <IconDeviceTv className="size-3.5 mr-2" />
                          16:9 Landscape
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setCanvasSize({ width: 1080, height: 1920 }, "9:16")}
                        >
                          <IconDeviceMobile className="size-3.5 mr-2" />
                          9:16 Vertical
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setCanvasSize({ width: 1080, height: 1080 }, "1:1")}
                        >
                          <IconSquare className="size-3.5 mr-2" />
                          1:1 Square
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Export Button */}
                    <Button
                      onClick={() => setIsExportOpen(true)}
                      className="h-8 text-xs font-semibold px-3 bg-foreground text-background hover:bg-foreground/90 rounded-md flex items-center gap-2"
                    >
                      <span>Export</span>
                      <span className="text-[10px] opacity-65 bg-background/20 px-1 py-0.5 rounded font-mono">
                        Ctrl+E
                      </span>
                    </Button>

                    {!isCopilotVisible && (
                      <Button
                        onClick={toggleCopilot}
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <IconLayoutSidebarRightExpand className="size-4" />
                        <span className="sr-only">Open assistant</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {/* Top Panel: Media Panel + Canvas */}
              <ResizablePanel
                defaultSize={100 - timeline}
                minSize={30}
                className="min-h-0 overflow-visible!"
              >
                <div className="h-full w-full flex flex-row gap-0 overflow-visible!">
                  <MediaPanel />
                  <div className="flex-1 min-w-0 min-h-0">
                    <CanvasPanel
                      onReady={() => {
                        setIsReady(true);
                      }}
                    />
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle className="bg-border/90" />

              {/* Bottom Panel: Timeline */}
              <ResizablePanel
                defaultSize={timeline}
                minSize={15}
                maxSize={70}
                onResize={setTimeline}
                className="min-h-0"
              >
                <Timeline />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {isCopilotVisible && (
            <>
              <ResizableHandle className="bg-border/90" />

              {/* Right Panel: Assistant (Full Height) */}
              <ResizablePanel
                defaultSize={copilotPanel}
                minSize={15}
                maxSize={40}
                onResize={setCopilotPanel}
                className="max-w-4xl min-w-[320px] relative overflow-visible! min-w-0"
              >
                <Assistant onClose={toggleCopilot} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Floating Controls like Caption / Animation pickers */}
      <FloatingControl />

      {/* WebCodecs Support Check Modal */}
      <WebCodecsUnsupportedModal open={!isWebCodecsSupported} />

      {/* Export Modal */}
      <ExportModal open={isExportOpen} onOpenChange={setIsExportOpen} />
    </div>
  );
}
