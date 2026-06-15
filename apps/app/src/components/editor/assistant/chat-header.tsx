"use client";

import { RiRefreshLine, RiAddLine, RiSideBarLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  title?: string;
  isConnected?: boolean;
  onRefresh?: () => void;
  onNewChat?: () => void;
  onClose?: () => void;
}

export function ChatHeader({
  title = "Director",
  isConnected,
  onRefresh,
  onNewChat,
  onClose,
}: ChatHeaderProps) {
  return (
    <div className="h-13 border-b">
      <div className="flex items-center  justify-between px-4 h-full shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={onRefresh}
          >
            <RiRefreshLine className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={onNewChat}
          >
            <RiAddLine className="size-4" />
            <span className="sr-only">New chat</span>
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <RiSideBarLine className="size-4" />
              <span className="sr-only">Close assistant</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
