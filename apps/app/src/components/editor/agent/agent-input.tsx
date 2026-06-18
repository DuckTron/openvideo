"use client";

import { RiArrowUpLine, RiAttachmentLine } from "@remixicon/react";

import { cn } from "@/lib/utils";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
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
    <div className={cn("p-4 md:p-3 pt-0 space-y-4 shrink-0", className)}>
      <HoverBorderGradient containerClassName="rounded-sm w-full" className="w-full bg-card">
        <InputGroup className="rounded-sm border-none has-disabled:opacity-100 bg-input/30!">
          <InputGroupTextarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-16 max-h-[200px] border-none focus-visible:ring-0"
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton variant="ghost" className="rounded-lg text-foreground">
              <RiAttachmentLine className="w-4 h-4" />
            </InputGroupButton>
            <InputGroupButton
              variant="default"
              className="rounded-full ml-auto bg-foreground hover:bg-foreground/90 text-background"
              size="icon-xs"
              onClick={onSend}
              disabled={!value.trim() || disabled}
            >
              <RiArrowUpLine className="w-4 h-4" />
              <span className="sr-only">Send</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </HoverBorderGradient>
    </div>
  );
}
