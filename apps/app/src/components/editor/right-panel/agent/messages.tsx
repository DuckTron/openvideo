"use client";

import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RiArrowGoBackLine } from "@remixicon/react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
      <div ref={scrollRef} className="min-h-full flex flex-col overflow-x-hidden p-3 space-y-4">
        {messages.map((m, i) => (
          <div
            key={m.id || i}
            className="w-full flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {m.role === "user" ? (
              <div className="w-full bg-secondary/50 border border-border/40 rounded-none py-2 px-3 flex items-center justify-between gap-3 shadow-xs">
                <span className="text-xs text-foreground font-medium">{m.content}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground/60 hover:text-foreground shrink-0 cursor-pointer"
                    >
                      <RiArrowGoBackLine className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Revert</TooltipContent>
                </Tooltip>
              </div>
            ) : m.type === "plan" ? (
              <div className="w-full bg-amber-950/20 border border-amber-500/15 text-amber-200/90 rounded-lg p-2.5 font-mono text-[11px] leading-relaxed shadow-xs">
                {m.content}
              </div>
            ) : (
              <div className="w-full grid overflow-hidden text-xs leading-relaxed text-foreground/90 pl-1 py-1 whitespace-pre-wrap">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ className: cn2, ...props }) => (
                      <p
                        className={cn(
                          "mb-3 last:mb-0 text-xs text-foreground/90 leading-relaxed",
                          cn2,
                        )}
                        {...props}
                      />
                    ),
                    ul: ({ className: cn2, ...props }) => (
                      <ul
                        className={cn(
                          "my-1.5 ml-4 list-disc space-y-0.5 text-xs text-foreground/90",
                          cn2,
                        )}
                        {...props}
                      />
                    ),
                    ol: ({ className: cn2, ...props }) => (
                      <ol
                        className={cn(
                          "my-1.5 ml-4 list-decimal space-y-0.5 text-xs text-foreground/90",
                          cn2,
                        )}
                        {...props}
                      />
                    ),
                    li: ({ className: cn2, ...props }) => (
                      <li
                        className={cn("text-xs text-foreground/90 leading-relaxed", cn2)}
                        {...props}
                      />
                    ),
                    strong: ({ className: cn2, ...props }) => (
                      <strong className={cn("font-semibold text-foreground", cn2)} {...props} />
                    ),
                    em: ({ className: cn2, ...props }) => (
                      <em className={cn("italic text-foreground/90", cn2)} {...props} />
                    ),
                    code: ({ className: cn2, ...props }) => (
                      <code
                        className={cn(
                          "bg-secondary/60 border border-border/30 px-1 py-0.5 rounded font-mono text-[11px] text-foreground",
                          cn2,
                        )}
                        {...props}
                      />
                    ),
                    pre: ({ className: cn2, ...props }) => (
                      <pre
                        className={cn(
                          "bg-secondary/40 p-2 rounded my-2.5 overflow-x-auto font-mono text-[11px] border border-border/30 text-foreground",
                          cn2,
                        )}
                        {...props}
                      />
                    ),
                    a: ({ className: cn2, ...props }) => (
                      <a
                        className={cn("text-primary hover:underline font-medium", cn2)}
                        {...props}
                      />
                    ),
                    h1: ({ className: cn2, ...props }) => (
                      <h1
                        className={cn("text-sm font-bold text-foreground mt-3 mb-1.5", cn2)}
                        {...props}
                      />
                    ),
                    h2: ({ className: cn2, ...props }) => (
                      <h2
                        className={cn("text-xs font-bold text-foreground mt-3 mb-1.5", cn2)}
                        {...props}
                      />
                    ),
                    h3: ({ className: cn2, ...props }) => (
                      <h3
                        className={cn("text-xs font-semibold text-foreground mt-2 mb-1", cn2)}
                        {...props}
                      />
                    ),
                    h4: ({ className: cn2, ...props }) => (
                      <h4
                        className={cn("text-xs font-medium text-foreground mt-1 mb-0.5", cn2)}
                        {...props}
                      />
                    ),
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="flex items-center gap-2 py-1.5 pl-1 w-full animate-in fade-in duration-300">
            <div className="flex gap-[3px]">
              <div className="w-1 h-1 bg-muted-foreground/75 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-1 bg-muted-foreground/75 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 bg-muted-foreground/75 rounded-full animate-bounce" />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Thinking...</span>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
