import { FolderOpenIcon, ShapesIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import {
  IconFolder,
  IconSparkles,
  IconAdjustmentsHorizontal,
  IconCircleSquare,
  IconSubtitles,
  IconMusic,
  type IconProps,
} from "@tabler/icons-react";
import { create } from "zustand";

export type Tab = "project" | "ai" | "properties" | "elements" | "captions" | "media" | "assistant";

export const tabs: {
  [key in Exclude<Tab, "assistant">]: { icon: React.FC<IconProps> | React.FC<any>; label: string };
} = {
  project: {
    icon: FolderOpenIcon,
    label: "Project",
  },
  ai: {
    icon: IconSparkles,
    label: "AI Tools",
  },
  properties: {
    icon: SlidersHorizontalIcon,
    label: "Properties",
  },
  elements: {
    icon: ShapesIcon,
    label: "Elements",
  },
  captions: {
    icon: IconSubtitles,
    label: "Captions",
  },
  media: {
    icon: IconMusic,
    label: "Media",
  },
};

interface MediaPanelStore {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  highlightMediaId: string | null;
  requestRevealMedia: (mediaId: string) => void;
  clearHighlight: () => void;
  showProperties: boolean;
  setShowProperties: (show: boolean) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
}

export const useMediaPanelStore = create<MediaPanelStore>((set) => ({
  activeTab: "project",
  setActiveTab: (tab) =>
    set({ activeTab: tab, showProperties: tab === "properties", isOpen: true }),
  highlightMediaId: null,
  requestRevealMedia: (mediaId) =>
    set({
      activeTab: "project",
      highlightMediaId: mediaId,
      showProperties: false,
      isOpen: true,
    }),
  clearHighlight: () => set({ highlightMediaId: null }),
  showProperties: false,
  setShowProperties: (show) => set({ showProperties: show }),
  isOpen: true,
  setIsOpen: (open) => set({ isOpen: open }),
  showLabels: false,
  setShowLabels: (show) => set({ showLabels: show }),
}));
