"use client";

import { Button } from "@/components/ui/button";
import { IconMinus, IconPlus } from "@tabler/icons-react";

interface SectionHeaderProps {
  title: string;
  hasContent: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

export function SectionHeader({ title, hasContent, onAdd, onRemove }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs font-semibold text-foreground">{title}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 rounded-sm text-muted-foreground"
        onClick={hasContent ? onRemove : onAdd}
      >
        {hasContent ? <IconMinus className="size-4" /> : <IconPlus className="size-4" />}
      </Button>
    </div>
  );
}
