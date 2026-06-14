"use client";

import { useState } from "react";
import { useDirector } from "@/hooks/use-director";
import { ChatPanel } from "./chat-panel";
import { ChatHeader } from "./chat-header";
import { useProjectStore } from "@/stores/project-store";

export default function Assistant({ onClose }: { onClose?: () => void }) {
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
    <div className="flex flex-col h-full text-foreground text-sm overflow-hidden pl-1">
      <div className=" h-full w-full flex flex-col">
        <ChatHeader onClose={onClose} />

        <ChatPanel
          messages={messages}
          isThinking={isThinking}
          input={input}
          onInputChange={setInput}
          onSend={handleSubmit}
          placeholder="How can I help you edit?"
          emptyState={
            <div className="p-6">
              <div className="max-w-lg font-regular text-sm">
                Fresh project — describe what you want to see, or let&apos;s brainstorm about where
                to start.
              </div>
            </div>
          }
          className="flex-1 min-h-0"
        />
      </div>
    </div>
  );
}
