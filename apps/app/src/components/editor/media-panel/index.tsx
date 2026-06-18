"use client";

import { TabBar } from "./tabbar";
import { tabs, useMediaPanelStore, type Tab } from "./store";
import PanelAssets from "./panel/assets";
import PanelEffect from "./panel/effects";
import PanelTransition from "./panel/transition";
import PanelText from "./panel/text";
import PanelCaptions from "./panel/captions";
import PanelElements from "./panel/elements";

const viewMap: Record<Tab, React.ReactNode> = {
  assets: <PanelAssets showHeader={false} />,
  text: <PanelText />,
  captions: <PanelCaptions />,
  transitions: <PanelTransition />,
  effects: <PanelEffect />,
  elements: <PanelElements />,
};

export function MediaPanel() {
  const { activeTab, isOpen } = useMediaPanelStore();

  return (
    <div className="h-full bg-background rounded-sm relative shrink-0 flex flex-row">
      <TabBar />
      {isOpen && (
        <div className="w-[320px] border-r h-full flex flex-col overflow-hidden animate-in slide-in-from-left-2 duration-200">
          <div className="h-full flex flex-col">
            <div className="h-12 items-center flex gap-2 px-6 shrink-0">
              <span className="text-sm font-medium">{tabs[activeTab].label}</span>
            </div>
            <div className="flex-1 overflow-auto">{viewMap[activeTab]}</div>
          </div>
        </div>
      )}
    </div>
  );
}
