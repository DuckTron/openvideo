"use client";
import { cn } from "@/lib/utils";
import { type Tab, tabs, useMediaPanelStore } from "./store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IconRobot } from "@tabler/icons-react";
import { RobotIcon } from "@phosphor-icons/react";

export function TabBar() {
  const { activeTab, setActiveTab, isOpen, setIsOpen } = useMediaPanelStore();

  const handleTabClick = (tabKey: Tab) => {
    if (activeTab === tabKey && isOpen) {
      setIsOpen(false);
    } else {
      setActiveTab(tabKey);
      setIsOpen(true);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col justify-between items-start py-4 pr-2 bg-background shrink-0 select-none h-full",
        isOpen ? "pl-0" : "pl-2",
      )}
    >
      {/* Top Icons */}
      <div className="flex flex-col items-start gap-3 w-full">
        {(Object.keys(tabs) as Exclude<Tab, "assistant">[]).map((tabKey) => {
          const tab = tabs[tabKey];
          const isActive = activeTab === tabKey && isOpen;
          return (
            <Tooltip key={tabKey} delayDuration={50}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleTabClick(tabKey)}
                  className={cn(
                    "flex flex-col w-18 items-center justify-center py-2.5 rounded-md transition-all duration-200 cursor-pointer focus:outline-none font-medium",
                    isActive
                      ? "bg-secondary/80 text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                  )}
                >
                  <tab.icon className="size-4.5 mb-1" />
                  <span className="text-[11px] tracking-wide">{tab.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center" sideOffset={8}>
                {tab.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Director (Bottom Icon) + avatar */}
      <div className="flex flex-col items-start gap-4 w-full">
        <Tooltip delayDuration={50}>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleTabClick("assistant")}
              className={cn(
                "flex flex-col items-center justify-center w-18 py-2.5 rounded-md transition-all duration-200 cursor-pointer focus:outline-none",
                activeTab === "assistant" && isOpen
                  ? "bg-secondary/80 text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
              )}
            >
              <RobotIcon className="size-4.5 mb-1" />
              <span className="text-[11px] tracking-wide">Director</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" align="center" sideOffset={8}>
            Director AI
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
