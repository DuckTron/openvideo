"use client";

import { TabBar } from "./tabbar";
import { tabs, useMediaPanelStore, type Tab } from "./store";
import PanelAssets from "./panel/assets";
import PanelEffect from "./panel/effects";
import PanelTransition from "./panel/transition";
import PanelText from "./panel/text";
import PanelCaptions from "./panel/captions";
import PanelElements from "./panel/elements";
import { useStudioStore } from "@/stores/studio-store";
import { PropertiesPanel } from "../properties-panel";
import { RiArrowLeftLine, RiArrowLeftSLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

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
  const { selectedClips, setSelectedClips } = useStudioStore();

  const hasSelection = selectedClips.length > 0;
  const activeClip = selectedClips[0];

  const getPanelTitle = () => {
    if (hasSelection) {
      if (selectedClips.length > 1) return "Group Properties";
      return `${activeClip.type} Properties`;
    }
    return tabs[activeTab].label;
  };

  const handleClose = () => {
    if (hasSelection) {
      setSelectedClips([]);
    } else {
      setIsOpen(false);
    }
  };

  const showPanelContent = isOpen || hasSelection;

  return (
    <div className="h-full bg-background rounded-sm relative shrink-0 flex flex-row">
      <TabBar />
      {showPanelContent && (
        <div className="w-[360px] border-r  h-full flex flex-col overflow-hidden animate-in slide-in-from-left-2 duration-200">
          <div className="h-full flex flex-col">
            <div className="h-12 items-center flex gap-2 px-6 shrink-0">
              {hasSelection && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 -ml-2"
                  onClick={handleClose}
                  title="Back"
                >
                  <RiArrowLeftLine className="size-4" />
                </Button>
              )}
              <span className="text-sm font-medium">{getPanelTitle()}</span>
            </div>
            <div className="flex-1 overflow-auto">
              {hasSelection ? <PropertiesPanel /> : viewMap[activeTab]}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
