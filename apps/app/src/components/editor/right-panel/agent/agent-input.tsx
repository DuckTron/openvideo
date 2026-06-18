"use client";

import { RiArrowUpLine, RiAttachmentLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

interface AgentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AgentInput({
  value,
  onChange,
  onSend,
  placeholder = "How can I help you?",
  disabled = false,
  className,
}: AgentInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={cn("pb-3 shrink-0", className)}>
      <InputGroup className="has-disabled:opacity-100 bg-input/30!">
        <InputGroupTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <InputGroupAddon align="block-end" className="justify-between">
          <InputGroupButton variant="ghost" className="text-foreground">
            <RiAttachmentLine className="size-4" />
          </InputGroupButton>
          <InputGroupButton
            variant="secondary"
            size="icon-sm"
            onClick={onSend}
            disabled={!value.trim() || disabled}
          >
            <RiArrowUpLine className="size-4" />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
