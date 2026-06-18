"use client";

import { useState } from "react";
import { useDirector } from "@/hooks/use-director";
import { useProjectStore } from "@/stores/project-store";
import { AgentHeader } from "./agent/header";
import { AgentMessages } from "./agent/messages";
import { AgentInput } from "./agent/agent-input";

export default function AgentPanel() {
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
    <div className="flex flex-col h-full text-foreground text-sm overflow-hidden px-4 space-y-2">
      <AgentHeader />

      <AgentMessages messages={messages} isThinking={isThinking} className="flex-1 min-h-0" />

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
