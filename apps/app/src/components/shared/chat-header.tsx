"use client";

import { IconRefresh, IconPlus, IconLayoutSidebarRightCollapse } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
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
  isConnected = true,
  onRefresh,
  onNewChat,
  onClose,
}: ChatHeaderProps) {
  return (
    <div className="h-13 pb-1">
      <div className="flex items-center bg-card/70 justify-between px-4 h-full shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={onRefresh}
          >
            <IconRefresh className="size-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={onNewChat}
          >
            <IconPlus className="size-4" />
            <span className="sr-only">New chat</span>
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <IconLayoutSidebarRightCollapse className="size-4" />
              <span className="sr-only">Close assistant</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
