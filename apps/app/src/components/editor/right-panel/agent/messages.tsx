"use client";

import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/hooks/use-director";

interface AgentMessagesProps {
  messages: Message[];
  isThinking: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export function AgentMessages({ messages, isThinking, emptyState, className }: AgentMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.closest("[data-radix-scroll-area-viewport]");
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isThinking]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <ScrollArea className={cn("flex-1 min-h-0 h-full", className)}>
      <div
        ref={scrollRef}
        className="min-h-full flex flex-col overflow-x-hidden p-4 md:p-6 space-y-4"
      >
        {messages.map((m, i) => (
          <div
            key={m.id || i}
            className={cn(
              "flex gap-3 w-full group animate-in fade-in slide-in-from-bottom-2 duration-300",
              m.role === "user" ? "flex-row-reverse" : "flex-row",
            )}
          >
            <div
              className={cn(
                "flex flex-col space-y-1 max-w-[95%]",
                m.role === "user" ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "py-2.5 px-4 rounded-2xl text-[14px] leading-relaxed transition-all whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none shadow-sm font-medium"
                    : m.type === "plan"
                      ? "bg-amber-950/50 border border-amber-700/30 text-amber-200/90 rounded-tl-none font-mono text-xs shadow-sm"
                      : "bg-secondary/40 text-foreground/90 rounded-tl-none border border-border/50",
                )}
              >
                {m.role === "user" ? (
                  m.content
                ) : (
                  <div className="w-full grid overflow-hidden prose prose-sm dark:prose-invert prose-p:text-foreground/85 prose-strong:text-foreground">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ className: cn2, ...props }) => (
                          <p className={cn("mb-0 last:mb-0", cn2)} {...props} />
                        ),
                        ul: ({ className: cn2, ...props }) => (
                          <ul className={cn("my-2 ml-4 list-disc", cn2)} {...props} />
                        ),
                        ol: ({ className: cn2, ...props }) => (
                          <ol className={cn("my-2 ml-4 list-decimal", cn2)} {...props} />
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="py-2 px-1 flex items-center gap-2.5">
              <div className="flex gap-[5px]">
                <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Thinking
              </span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
