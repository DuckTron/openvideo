"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/project-store";
import { Log } from "@openvideo/engine-pixi";
import { ExportModal } from "./export-modal";
import Link from "next/link";
import { Keyboard, ChevronLeft, PenLine, Bot, Play, Undo2, Redo2, Download } from "lucide-react";
import { toast } from "sonner";
import { ShortcutsModal } from "./shortcuts-modal";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AutosizeInput from "../ui/autosize-input";
import { authClient } from "@/lib/auth-client";
import { core, projectStore } from "@/lib/project";
import { useStore } from "zustand";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePanelStore } from "@/stores/panel-store";

export default function Header() {
  const { aspectRatio, setCanvasSize } = useProjectStore();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: session } = authClient.useSession();
  const { projectName, setProjectName } = useProjectStore();
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(projectName || "Untitled video");
  const { editorMode, setEditorMode } = usePanelStore();

  // Sync title with store when project name changes externally (like on initial load)
  useEffect(() => {
    if (projectName && projectName !== title) {
      setTitle(projectName);
    }
  }, [projectName]);

  const handleApplyCustomSize = () => {
    const w = parseInt(customWidth);
    const h = parseInt(customHeight);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      setCanvasSize({ width: w, height: h }, "Custom");
    } else {
      toast.error("Invalid dimensions");
    }
  };

  const handleGetStarted = (route: string) => {
    router.push(route);
  };

  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  // Track undo/redo availability from Core store history
  const canUndo = useStore(projectStore, (s) => s.history.length > 0);
  const canRedo = useStore(projectStore, (s) => s.future.length > 0);

  // NOTE: canUndo/canRedo state now sourced from core.store

  const handleExportJSON = () => {
    try {
      const json = core.project.export();
      if (Object.keys(json.clips).length === 0) {
        alert("No clips to export");
        return;
      }

      const jsonString = JSON.stringify(json, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const aEl = document.createElement("a");
      document.body.appendChild(aEl);
      aEl.href = url;
      aEl.download = `${projectName || "project"}-${Date.now()}.json`;
      aEl.click();

      setTimeout(() => {
        if (document.body.contains(aEl)) {
          document.body.removeChild(aEl);
        }
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      Log.error("Export to JSON error:", error);
      alert("Failed to export to JSON: " + (error as Error).message);
    }
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const json = JSON.parse(text);
        core.project.import(json);
        toast.success("Project imported successfully");
      } catch (error) {
        Log.error("Load from JSON error:", error);
        alert("Failed to load from JSON: " + (error as Error).message);
      } finally {
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      }
    };

    document.body.appendChild(input);
    input.click();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  return (
    <header className="relative flex h-[52px] w-full shrink-0 items-center justify-between px-3 bg-card z-10 border-b">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Link href="/home">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center">
          <AutosizeInput
            name="title"
            value={title}
            onChange={handleTitleChange}
            width={150}
            inputClassName="border-none bg-transparent px-2 py-1 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:bg-muted"
          />
        </div>
      </div>

      {/* Center Section - Mode Toggle */}
      <Tabs
        value={editorMode}
        onValueChange={(v) => setEditorMode(v as "editor" | "agent" | "playground")}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <TabsList className="h-8 bg-muted/80 border shadow-sm">
          <TabsTrigger value="editor" className="text-xs gap-1.5 px-3 h-6">
            <PenLine className="h-3.5 w-3.5" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="agent" className="text-xs gap-1.5 px-3 h-6">
            <Bot className="h-3.5 w-3.5" />
            Agent
          </TabsTrigger>
          <TabsTrigger value="playground" className="text-xs gap-1.5 px-3 h-6">
            <Play className="h-3.5 w-3.5" />
            Playground
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Right Section */}
      <div className="flex items-center gap-2 pr-1">
        <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
          <Button
            onClick={() => core.undo()}
            disabled={!canUndo}
            variant="ghost"
            size="icon"
            className="h-7 w-7"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => core.redo()}
            disabled={!canRedo}
            variant="ghost"
            size="icon"
            className="h-7 w-7"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setIsShortcutsModalOpen(true)}
        >
          <Keyboard className="h-4 w-4" />
        </Button>

        <Button size="sm" className="gap-2 h-8 px-3" onClick={() => setIsExportModalOpen(true)}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>

        <ExportModal open={isExportModalOpen} onOpenChange={setIsExportModalOpen} />
        <ShortcutsModal open={isShortcutsModalOpen} onOpenChange={setIsShortcutsModalOpen} />
      </div>
    </header>
  );
}
