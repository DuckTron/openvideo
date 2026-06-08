"use client";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { SectionHeader } from "./section-header";

interface Animation {
  id: string;
  type: string;
  options?: {
    id?: string;
    duration?: number;
    [key: string]: any;
  };
}

interface AnimationsPropertyProps {
  animations: Animation[];
  onAdd: () => void;
  onRemove: () => void;
  onEdit: (animationId: string) => void;
  onDelete: (animationId: string) => void;
}

export function AnimationsProperty({
  animations,
  onAdd,
  onRemove,
  onEdit,
  onDelete,
}: AnimationsPropertyProps) {
  const hasAnimations = animations.length > 0;

  return (
    <Collapsible open={hasAnimations}>
      <SectionHeader
        title="Animations"
        hasContent={hasAnimations}
        onAdd={onAdd}
        onRemove={onRemove}
      />
      <CollapsibleContent>
        <div className="pb-2 flex flex-col gap-2">
          {animations.map((anim) => (
            <div
              key={anim.options?.id ?? anim.id}
              className="flex items-center justify-between p-2 bg-secondary/30 rounded-md group"
            >
              <div className="flex flex-col flex-1">
                <span className="text-xs font-medium capitalize">{anim.type}</span>
                <span className="text-[10px] text-muted-foreground">
                  {Math.round((anim.options?.duration ?? 0) / 1e6)}s duration
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 group-hover:opacity-100"
                  onClick={() => onEdit(anim.id)}
                >
                  <IconEdit className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400"
                  onClick={() => onDelete(anim.id)}
                >
                  <IconTrash className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
