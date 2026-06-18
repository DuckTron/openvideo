"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MediaPanel } from "@/components/editor/media-panel";
import { CanvasPanel } from "@/components/editor/canvas-panel";
import Timeline from "@/components/editor/timeline";
import { usePanelStore } from "@/stores/panel-store";
import { Loading } from "@/components/editor/loading";
import FloatingControl from "@/components/editor/floating-controls/floating-control";
import { Compositor } from "@openvideo/engine-pixi";
import { WebCodecsUnsupportedModal } from "@/components/editor/webcodecs-unsupported-modal";
import Agent from "./agent/agent";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import { core } from "@/lib/project";
import { IProject } from "@openvideo/core";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/project-store";
import Header from "./header";
import { data } from "./data";

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

  const { editorMode, isCopilotVisible, toggleCopilot } = usePanelStore();

  const [isReady, setIsReady] = useState(false);
  const [isWebCodecsSupported, setIsWebCodecsSupported] = useState(true);
  const [rightTab, setRightTab] = useState<"agent" | "style">("agent");

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

      {/* Header — full width */}
      <Header />

      {/* Main content row: left sidebar + center + right sidebar */}
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
        {/* Left Sidebar: Media Panel */}
        <div className="w-[280px] shrink-0 h-full overflow-hidden">
          <MediaPanel />
        </div>

        {/* Center: Canvas (top) + Timeline (bottom) */}
        <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-visible">
            <CanvasPanel onReady={() => setIsReady(true)} />
          </div>
          <div className="shrink-0">
            <Timeline />
          </div>
        </div>

        <div className="w-[280px] shrink-0 h-full overflow-hidden flex flex-col">
          <div className="p-3">
            <div className="inline-flex w-full items-center justify-center rounded-none bg-muted p-[3px] h-8 text-xs text-muted-foreground shrink-0">
              <button
                type="button"
                onClick={() => setRightTab("agent")}
                className={`relative inline-flex flex-1 h-[calc(100%-1px)] items-center justify-center rounded-none border border-transparent px-1.5 py-0.5 text-xs font-medium whitespace-nowrap transition-all hover:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                  rightTab === "agent"
                    ? "bg-background text-foreground dark:border-input dark:bg-input/30"
                    : "text-foreground/60 dark:text-muted-foreground"
                }`}
              >
                Agent
              </button>
              <button
                type="button"
                onClick={() => setRightTab("style")}
                className={`relative inline-flex flex-1 h-[calc(100%-1px)] items-center justify-center rounded-none border border-transparent px-1.5 py-0.5 text-xs font-medium whitespace-nowrap transition-all hover:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
                  rightTab === "style"
                    ? "bg-background text-foreground dark:border-input dark:bg-input/30"
                    : "text-foreground/60 dark:text-muted-foreground"
                }`}
              >
                Style
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 mt-0 overflow-hidden" hidden={rightTab !== "agent"}>
            <Agent onClose={toggleCopilot} />
          </div>
          <div className="flex-1 min-h-0 mt-0 overflow-hidden" hidden={rightTab !== "style"}>
            <PropertiesPanel />
          </div>
        </div>
      </div>

      {/* Floating Controls like Caption / Animation pickers */}
      <FloatingControl />

      {/* WebCodecs Support Check Modal */}
      <WebCodecsUnsupportedModal open={!isWebCodecsSupported} />
    </div>
  );
}
