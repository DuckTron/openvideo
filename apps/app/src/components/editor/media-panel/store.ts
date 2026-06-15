import {
  RiImage2Line,
  RiText,
  RiClosedCaptioningLine,
  RiGitMergeLine,
  RiSparkling2Line,
  RiShapesLine,
  RiFolderOpenLine,
} from "@remixicon/react";
import { create } from "zustand";

export type Tab = "assets" | "text" | "captions" | "effects" | "transitions" | "elements";

export const tabs: {
  [key in Tab]: { icon: React.ComponentType<any> | React.FC<any>; label: string };
} = {
  assets: {
    icon: RiFolderOpenLine,
    label: "Assets",
  },
  text: {
    icon: RiText,
    label: "Text",
  },
  captions: {
    icon: RiClosedCaptioningLine,
    label: "Captions",
  },
  transitions: {
    icon: RiGitMergeLine,
    label: "Transitions",
  },
  effects: {
    icon: RiSparkling2Line,
    label: "Effects",
  },
  elements: {
    icon: RiShapesLine,
    label: "Elements",
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
  activeTab: "assets",
  setActiveTab: (tab) => set({ activeTab: tab, showProperties: false, isOpen: true }),
  highlightMediaId: null,
  requestRevealMedia: (mediaId) =>
    set({
      activeTab: "assets",
      highlightMediaId: mediaId,
      showProperties: false,
      isOpen: true,
    }),
  clearHighlight: () => set({ highlightMediaId: null }),
  showProperties: false,
  setShowProperties: (show) => set({ showProperties: show }),
  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),
  showLabels: false,
  setShowLabels: (show) => set({ showLabels: show }),
}));
