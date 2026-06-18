"use client";

import { useState } from "react";
import AgentPanel from "./agent-panel";
import { PropertiesPanel } from "./properties-panel";

type RightTab = "agent" | "style";

export function RightPanel() {
  const [rightTab, setRightTab] = useState<RightTab>("agent");

  return (
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
      <div className="flex-1 min-h-0 mt-0 overflow-hidden">
        {rightTab === "agent" ? <AgentPanel /> : <PropertiesPanel />}
      </div>
    </div>
  );
}
