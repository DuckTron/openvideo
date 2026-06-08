import { ScrollArea } from "@/components/ui/scroll-area";
import { IClip } from "@openvideo/engine-pixi";
import { cn } from "@/lib/utils";
import { UnifiedPropertiesPanel } from "./unified-properties-panel";

// Legacy imports - to be removed after full migration
import { TextProperties } from "./text-properties";
import { CaptionProperties } from "./caption-properties";
import { EffectProperties } from "./effect-properties";
import { TransitionProperties } from "./transition-properties";
import { AudioProperties } from "./audio-properties";

// Feature flag: Set to false to use legacy panels during testing
const USE_UNIFIED_PANEL = true; // Now all types are migrated

export function PropertiesPanel({ selectedClips }: { selectedClips: IClip[] }) {
  if (selectedClips.length > 1) {
    return (
      <div className="bg-card h-full p-4 flex flex-col items-center justify-center gap-3">
        <div className="text-lg font-medium">Group</div>
      </div>
    );
  }

  if (selectedClips.length === 0) return null;

  const clip = selectedClips[0];

  const renderSpecificProperties = () => {
    // Use unified panel for all clip types
    if (USE_UNIFIED_PANEL) {
      return <UnifiedPropertiesPanel clip={clip} />;
    }

    // Legacy fallback (kept for emergency use)
    switch (clip.type) {
      case "Text":
        return <TextProperties clip={clip} />;
      case "Caption":
        return <CaptionProperties clip={clip} />;
      case "Audio":
        return <AudioProperties clip={clip} />;
      case "Effect":
        return <EffectProperties clip={clip} />;
      case "Transition":
        return <TransitionProperties clip={clip} />;
      default:
        return <UnifiedPropertiesPanel clip={clip} />;
    }
  };

  return (
    <ScrollArea className="h-full">
      <div
        className={cn(
          "flex flex-col gap-4 p-4 transition-opacity",
          clip.locked && "opacity-50 pointer-events-none select-none",
        )}
      >
        {renderSpecificProperties()}
      </div>
    </ScrollArea>
  );
}
