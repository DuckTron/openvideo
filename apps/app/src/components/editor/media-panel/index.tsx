"use client";

import { cn } from "@/lib/utils";
import { TabBar } from "./tabbar";
import { tabs, useMediaPanelStore, type Tab } from "./store";
import { Separator } from "@/components/ui/separator";
import PanelAssets from "./panel/assets";
import PanelEffect from "./panel/effects";
import PanelTransition from "./panel/transition";
import PanelText from "./panel/text";
import PanelCaptions from "./panel/captions";
import PanelElements from "./panel/elements";
import { IconX } from "@tabler/icons-react";

const viewMap: Record<Tab, React.ReactNode> = {
  assets: <PanelAssets showHeader={false} />,
  text: <PanelText />,
  captions: <PanelCaptions />,
  transitions: <PanelTransition />,
  effects: <PanelEffect />,
  elements: <PanelElements />,
};

export function MediaPanel() {
  const { activeTab, isOpen, setIsOpen } = useMediaPanelStore();

  return (
    <div className="h-full bg-background rounded-sm relative shrink-0 flex flex-row">
      <TabBar />
      {isOpen && (
        <div className="w-[360px] pr-1 bg-background h-full flex flex-col overflow-hidden">
          <div className="bg-card/70 rounded-sm h-full">
            <div className="h-12 items-center flex justify-between px-4 shrink-0">
              <span className="text-sm font-medium">{tabs[activeTab].label}</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-md text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <IconX className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">{viewMap[activeTab]}</div>
          </div>
        </div>
      )}
    </div>
  );
}
