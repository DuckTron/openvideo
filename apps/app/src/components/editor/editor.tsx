"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CanvasPanel } from "@/components/editor/canvas-panel";
import Timeline from "@/components/editor/timeline";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { usePanelStore } from "@/stores/panel-store";
import { Loading } from "@/components/editor/loading";
import FloatingControl from "@/components/editor/floating-controls/floating-control";
import { Compositor } from "@openvideo/engine-pixi";
import { WebCodecsUnsupportedModal } from "@/components/editor/webcodecs-unsupported-modal";
import { core } from "@/lib/project";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/project-store";
import { useStudioStore } from "@/stores/studio-store";
import { data } from "./data";
import Header from "./header";
import { MediaPanel } from "@/components/editor/media-panel";
import { TabBar } from "@/components/editor/media-panel/tabbar";
import { useMediaPanelStore } from "@/components/editor/media-panel/store";

export default function Editor() {
  const params = useParams();
  const projectId = params?.projectId as string;

  const setProjectId = useProjectStore((state) => state.setProjectId);
  const setSpaceId = useProjectStore((state) => state.setSpaceId);
  const setProjectName = useProjectStore((state) => state.setProjectName);
  const resetProject = useProjectStore((state) => state.resetProject);

  const { copilotPanel, timeline, setCopilotPanel, setTimeline, editorMode } = usePanelStore();

  const [isReady, setIsReady] = useState(false);
  const [isWebCodecsSupported, setIsWebCodecsSupported] = useState(true);

  // Sync state with the existing MediaPanel store
  const { activeTab, setActiveTab, isOpen, setIsOpen } = useMediaPanelStore();
  const { selectedClips } = useStudioStore();

  // Switch to properties tab when a clip/element is selected
  useEffect(() => {
    if (selectedClips.length > 0) {
      setActiveTab("properties");
      setIsOpen(true);
    }
  }, [selectedClips, setActiveTab, setIsOpen]);

  useEffect(() => {
    setTimeout(() => {
      core.project.import(data);
    }, 1000);
  }, []);

  // tRPC query for project data
  const { data: projectData } = trpc.space.getById.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );

  // Reset store + canvas engine on every route entry / project switch
  useEffect(() => {
    resetProject();
    core.project.new();
  }, [projectId]);

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

  // Clear loading screen for non-editor modes
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

      {/* Top Navbar */}
      <Header />

      {/* Main Workspace below Header */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-row overflow-hidden">
        {/* Left Resizable Area (Canvas + Timeline + Active Tab panel if open) */}
        <div className="flex-1 min-w-0 h-full">
          <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-0">
            {/* Left/Middle Column: Canvas and Timeline (split vertically) */}
            <ResizablePanel
              defaultSize={isOpen ? 100 - copilotPanel : 100}
              minSize={50}
              className="min-w-0 h-full"
            >
              <ResizablePanelGroup direction="vertical" className="h-full w-full gap-0">
                {/* Top: Canvas Preview */}
                <ResizablePanel defaultSize={100 - timeline} minSize={30} className="min-h-0">
                  <CanvasPanel
                    onReady={() => {
                      setIsReady(true);
                    }}
                  />
                </ResizablePanel>

                <ResizableHandle className="bg-border/30 hover:bg-border/50 transition-colors" />

                {/* Bottom: Timeline */}
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

            {isOpen && (
              <>
                <ResizableHandle className="bg-border/30 hover:bg-border/50 transition-colors" />

                {/* Right Column: Active Tab Content Panel */}
                <ResizablePanel
                  defaultSize={copilotPanel}
                  minSize={20}
                  maxSize={45}
                  onResize={setCopilotPanel}
                  className="max-w-4xl relative overflow-visible! bg-card/45 min-w-[280px] h-full border-l border-border/40"
                >
                  <MediaPanel />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>

        {/* Vertical Tabbar on the far right - ALWAYS visible, full height, spans next to timeline too */}
        <TabBar />
      </div>

      {/* Floating Controls like Caption / Animation pickers */}
      <FloatingControl />

      {/* WebCodecs Support Check Modal */}
      <WebCodecsUnsupportedModal open={!isWebCodecsSupported} />
    </div>
  );
}
