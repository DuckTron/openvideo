"use client";
import { useState, useEffect } from "react";
import { useProjectStore } from "@/stores/project-store";
import { ExportModal } from "./export-modal";
import { ShortcutsModal } from "./shortcuts-modal";
import { useRouter, useParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { core, projectStore } from "@/lib/project";
import { useStore } from "zustand";
import {
  IconHome,
  IconMenu2,
  IconChevronDown,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCheck,
  IconDatabase,
  IconMessageCircle,
  IconKeyboard,
  IconDownload,
  IconLock,
} from "@tabler/icons-react";

export default function Header() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: session } = authClient.useSession();
  const { projectName } = useProjectStore();

  const canUndo = useStore(projectStore, (s) => s.history.length > 0);
  const canRedo = useStore(projectStore, (s) => s.future.length > 0);

  return (
    <header className="flex h-12 w-full shrink-0 items-center justify-between px-4 bg-background border-b border-border/50 z-20 select-none">
      {/* Left Action Group */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/spaces")}
          className="p-1.5 hover:bg-muted/50 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          title="Home"
        >
          <IconHome className="size-4.5" />
        </button>

        <button
          className="p-1.5 hover:bg-muted/50 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          title="Menu"
        >
          <IconMenu2 className="size-4.5" />
        </button>

        <button className="flex items-center gap-1 px-2 py-1 hover:bg-muted/50 rounded-md text-muted-foreground hover:text-foreground text-xs font-medium transition-colors">
          <span>View</span>
          <IconChevronDown className="size-3 text-muted-foreground" />
        </button>

        <div className="w-px h-4 bg-border/50 mx-1" />

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => core.undo()}
            disabled={!canUndo}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors disabled:opacity-25"
            title="Undo"
          >
            <IconArrowBackUp className="size-4.5" />
          </button>
          <button
            onClick={() => core.redo()}
            disabled={!canRedo}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors disabled:opacity-25"
            title="Redo"
          >
            <IconArrowForwardUp className="size-4.5" />
          </button>
        </div>

        <div className="p-1 text-emerald-500" title="Changes saved">
          <IconCheck className="size-4" strokeWidth={3} />
        </div>
      </div>

      {/* Center Group: Project Dropdown */}
      <div className="flex items-center justify-center">
        <button className="flex items-center gap-1.5 text-xs font-sans font-medium text-foreground hover:opacity-80 transition-opacity cursor-pointer focus:outline-none">
          <IconLock className="size-3.5 text-foreground" strokeWidth={1.8} />
          <span>Personal</span>
          <span className="font-light">/</span>
          <span>{projectName || "You've Got This: Start Now"}</span>
          <IconChevronDown className="size-3 text-foreground/80" />
        </button>
      </div>

      {/* Right Action Group */}
      <div className="flex items-center gap-2.5">
        {/* Token/Usage Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/40 border border-border/50 rounded-full text-[11px] text-muted-foreground font-medium select-none">
          <IconDatabase className="size-3.5 text-purple-400" />
          <span>40</span>
          <span className="text-muted-foreground/50">•</span>
          <span>59m</span>
        </div>

        {/* User initials bubble */}
        <div className="h-7.5 w-7.5 rounded-full bg-emerald-700/80 flex items-center justify-center text-xs font-bold text-white border border-border/40 select-none cursor-pointer">
          {session?.user?.name ? session.user.name.substring(0, 2).toUpperCase() : "+ J"}
        </div>

        <button
          onClick={() => setIsShortcutsModalOpen(true)}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
          title="Keyboard shortcuts"
        >
          <IconKeyboard className="size-4.5" />
        </button>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-foreground hover:bg-foreground/95 text-background text-xs font-semibold rounded-md transition-all"
        >
          <span>Export</span>
        </button>

        <ExportModal open={isExportModalOpen} onOpenChange={setIsExportModalOpen} />
        <ShortcutsModal open={isShortcutsModalOpen} onOpenChange={setIsShortcutsModalOpen} />
      </div>
    </header>
  );
}
