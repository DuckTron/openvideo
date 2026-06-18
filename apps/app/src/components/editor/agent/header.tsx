"use client";

import { RiAddLine, RiArrowDownSLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

interface AgentHeaderProps {
  conversationLabel?: string;
  onNewChat?: () => void;
}

export function AgentHeader({
  conversationLabel = "Start A Conversation",
  onNewChat,
}: AgentHeaderProps) {
  return (
    <div className="flex items-center gap-2  py-2 shrink-0">
      <Button variant="secondary" className="flex-1 justify-between font-medium">
        <span className="truncate">{conversationLabel}</span>
        <RiArrowDownSLine className="size-4 shrink-0 text-muted-foreground" />
      </Button>
      <Button variant="secondary" size="icon" className="shrink-0 size-9" onClick={onNewChat}>
        <RiAddLine className="size-4" />
        <span className="sr-only">New chat</span>
      </Button>
    </div>
  );
}
