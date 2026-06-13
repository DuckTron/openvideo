"use client";
import { useMediaPanelStore } from "./store";
import PanelAssets from "./panel/assets";
import PanelText from "./panel/text";
import PanelCaptions from "./panel/captions";
import PanelElements from "./panel/elements";
import PanelAITools from "./panel/ai-tools";
import Assistant from "../assistant/assistant";
import { PropertiesPanel } from "../properties-panel";
import { useProjectStore } from "@/stores/project-store";
import { IconFolder, IconUpload, IconPlus, IconCheck } from "@tabler/icons-react";

export function MediaPanel() {
  const { activeTab } = useMediaPanelStore();
  const projectName = useProjectStore((state) => state.projectName);

  switch (activeTab) {
    case "project":
      return <PanelAssets />;
    case "ai":
      return <PanelAITools />;
    case "assistant":
      return <Assistant />;
    case "properties":
      return <PropertiesPanel />;
    case "elements":
      return <PanelElements />;
    case "captions":
      return <PanelCaptions />;
    case "media":
      return <PanelText />;
    default:
      return <PropertiesPanel />;
  }
}
