"use client";

import { useState } from "react";
import { useDirector } from "@/hooks/use-director";
import { useProjectStore } from "@/stores/project-store";
import { AgentHeader } from "./header";
import { AgentMessages } from "./messages";
import { AgentInput } from "./agent-input";

export default function Agent({ onClose }: { onClose?: () => void }) {
  const spaceId = useProjectStore((state) => state.spaceId);
  const { messages, sendMessage, isConnected, isThinking } = useDirector(spaceId || "");
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (input.trim() && !isThinking) {
      sendMessage(input);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full text-foreground text-sm overflow-hidden px-4">
      <AgentHeader />

      <AgentMessages
        messages={messages}
        isThinking={isThinking}
        emptyState={
          <div>
            <div className="max-w-lg font-regular text-sm">
              Fresh project — describe what you want to see, or let&apos;s brainstorm about where to
              start.
            </div>
          </div>
        }
        className="flex-1 min-h-0"
      />

      <AgentInput
        value={input}
        onChange={setInput}
        onSend={handleSubmit}
        placeholder="How can I help you edit?"
        disabled={isThinking}
      />
    </div>
  );
}
