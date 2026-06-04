import { useEffect } from "react";
import hotkeys from "hotkeys-js";
import { useStore } from "zustand";
import { projectStore, core } from "@/lib/project";
import { useStudioStore } from "@/stores/studio-store";
import CanvasTimeline from "@/components/editor/timeline/items/timeline";
import { nanoid, AnyClip } from "@openvideo/core";

// Module-level clipboard for copy/paste - persists across renders
let clipboardClips: AnyClip[] = [];

interface UseEditorHotkeysProps {
  timelineCanvas: CanvasTimeline | null;
  setZoomLevel?: (zoomLevel: number | ((prev: number) => number)) => void;
}

export function useEditorHotkeys({ timelineCanvas, setZoomLevel }: UseEditorHotkeysProps) {
  const currentTimeUs = useStore(projectStore, (s) => s.currentTime);
  const isPlaying = useStore(projectStore, (s) => s.isPlaying);
  const selectedIds = useStore(projectStore, (s) => s.selectedIds);
  const fps = useStore(projectStore, (s) => s.settings.fps);
  const { studio } = useStudioStore();

  useEffect(() => {
    // Play/Pause
    hotkeys("space", (event, handler) => {
      event.preventDefault();
      core.playback.toggle();
    });

    // Split
    hotkeys("command+b, ctrl+b", (event, handler) => {
      event.preventDefault();
      core.clip.split(currentTimeUs);
    });

    // Delete
    hotkeys("backspace, delete", (event, handler) => {
      // Check if active element is input
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (selectedIds.length > 0) {
        core.clip.remove(selectedIds);
      }
    });

    // Select All
    hotkeys("command+a, ctrl+a", (event, handler) => {
      event.preventDefault();
      const { clips } = projectStore.getState();
      projectStore.getState().select(Object.keys(clips));
    });

    // Copy
    hotkeys("command+c, ctrl+c", (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      event.preventDefault();
      const { clips, selectedIds } = projectStore.getState();
      if (selectedIds.length === 0) return;

      // Store copies of selected clips
      clipboardClips = selectedIds
        .map((id) => clips[id])
        .filter(Boolean)
        .map((clip) => JSON.parse(JSON.stringify(clip)));
    });

    // Cut
    hotkeys("command+x, ctrl+x", (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      event.preventDefault();
      const { clips, selectedIds } = projectStore.getState();
      if (selectedIds.length === 0) return;

      // Store copies then delete
      clipboardClips = selectedIds
        .map((id) => clips[id])
        .filter(Boolean)
        .map((clip) => JSON.parse(JSON.stringify(clip)));

      core.clip.remove(selectedIds);
    });

    // Paste
    hotkeys("command+v, ctrl+v", (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      event.preventDefault();
      if (clipboardClips.length === 0) return;

      const currentTime = core.store.getState().currentTime;

      // Calculate the earliest start time among clipboard clips to maintain relative offsets
      const earliestFrom = Math.min(...clipboardClips.map((c) => c.timing?.display?.from ?? 0));

      // Create new clips at current time with relative offsets preserved
      const newClips = clipboardClips.map((clip) => {
        const offsetFromStart = (clip.timing?.display?.from ?? 0) - earliestFrom;
        const newFrom = currentTime + offsetFromStart;
        const duration = clip.timing?.duration ?? 0;

        return {
          ...clip,
          id: nanoid(),
          timing: {
            ...clip.timing,
            display: {
              ...clip.timing?.display,
              from: newFrom,
              to: newFrom + duration,
            },
          },
        };
      });

      // Add all clips and select the new ones
      Promise.all(newClips.map((clip) => core.clip.add(clip as AnyClip))).then(() => {
        projectStore.getState().select(newClips.map((c) => c.id));
      });
    });

    // Zoom In
    hotkeys("command+=, ctrl+=", (event) => {
      event.preventDefault();
      setZoomLevel?.((prev) => Math.min(10, prev + 0.15));
    });

    // Zoom Out
    hotkeys("command+-, ctrl+-", (event) => {
      event.preventDefault();
      setZoomLevel?.((prev) => Math.max(0.1, prev - 0.15));
    });

    // Undo / Redo
    hotkeys("command+z, ctrl+z", (event) => {
      event.preventDefault();
      core.undo();
    });

    hotkeys("command+shift+z, ctrl+shift+z, command+y, ctrl+y", (event) => {
      event.preventDefault();
      core.redo();
    });

    // Move Up
    hotkeys("up, shift+up", (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;
      event.preventDefault();
      const step = event.shiftKey ? 5 : 1;
      studio?.selection.move(0, -step);
    });

    // Move Down
    hotkeys("down, shift+down", (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;
      event.preventDefault();
      const step = event.shiftKey ? 5 : 1;
      studio?.selection.move(0, step);
    });

    // Move Left
    hotkeys("left, shift+left", (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;
      event.preventDefault();
      const step = event.shiftKey ? 5 : 1;
      studio?.selection.move(-step, 0);
    });

    // Move Right
    hotkeys("right, shift+right", (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;
      event.preventDefault();
      const step = event.shiftKey ? 5 : 1;
      studio?.selection.move(step, 0);
    });

    // Last Frame
    hotkeys("command+left, ctrl+left", (event) => {
      event.preventDefault();
      const frameDurationUs = 1_000_000 / fps;
      core.seek(Math.max(0, currentTimeUs - frameDurationUs));
    });

    // Next Frame
    hotkeys("command+right, ctrl+right", (event) => {
      event.preventDefault();
      const frameDurationUs = 1_000_000 / fps;
      core.seek(currentTimeUs + frameDurationUs);
    });

    return () => {
      hotkeys.unbind("space");
      hotkeys.unbind("command+b, ctrl+b");
      hotkeys.unbind("backspace, delete");
      hotkeys.unbind("command+a, ctrl+a");
      hotkeys.unbind("command+c, ctrl+c");
      hotkeys.unbind("command+x, ctrl+x");
      hotkeys.unbind("command+v, ctrl+v");
      hotkeys.unbind("command+=, ctrl+=");
      hotkeys.unbind("command+-, ctrl+-");
      hotkeys.unbind("command+z, ctrl+z");
      hotkeys.unbind("command+shift+z, ctrl+shift+z, command+y, ctrl+y");
      hotkeys.unbind("up, shift+up");
      hotkeys.unbind("down, shift+down");
      hotkeys.unbind("left, shift+left");
      hotkeys.unbind("right, shift+right");
      hotkeys.unbind("command+left, ctrl+left");
      hotkeys.unbind("command+right, ctrl+right");
    };
  }, [isPlaying, timelineCanvas, currentTimeUs, selectedIds, fps, setZoomLevel, studio]);
}
