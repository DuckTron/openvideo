"use client";
import { useState, useEffect } from "react";
import { Resizable } from "@/components/editor/resizable-panel";
import { useParams } from "next/navigation";
import { MediaPanel } from "@/components/editor/media-panel";
import { CanvasPanel } from "@/components/editor/canvas-panel";
import Timeline from "@/components/editor/timeline";
import { usePanelStore } from "@/stores/panel-store";
import { Loading } from "@/components/editor/loading";
import FloatingControl from "@/components/editor/floating-controls/floating-control";
import { Compositor } from "@openvideo/engine-pixi";
import { WebCodecsUnsupportedModal } from "@/components/editor/webcodecs-unsupported-modal";
import { RightPanel } from "./right-panel";
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

  const { editorMode } = usePanelStore();

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
        <Resizable orientation="horizontal" initialSize={300} min={180} max={520} direction="right">
          <MediaPanel />
        </Resizable>

        {/* Center: Canvas (top) + Timeline (bottom) */}
        <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-visible">
            <CanvasPanel onReady={() => setIsReady(true)} />
          </div>
          <Resizable orientation="vertical" initialSize={220} min={80} max={500} direction="up">
            <Timeline />
          </Resizable>
        </div>

        <Resizable orientation="horizontal" initialSize={280} min={180} max={520} direction="left">
          <RightPanel />
        </Resizable>
      </div>

      {/* Floating Controls like Caption / Animation pickers */}
      <FloatingControl />

      {/* WebCodecs Support Check Modal */}
      <WebCodecsUnsupportedModal open={!isWebCodecsSupported} />
    </div>
  );
}
