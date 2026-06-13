"use client";
import { frameToTimeString, timeToString } from "../utils/time";
import { useClipActions } from "../studio-context-menu";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import { useStore } from "zustand";
import { core, projectStore } from "@/lib/project";
import { useStudioStore } from "@/stores/studio-store";
import { ITimelineScaleState } from "@openvideo/timeline";
import { getFitZoomLevel } from "../utils/timeline";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import {
  IconPlus,
  IconMinus,
  IconChevronsLeft,
  IconChevronsRight,
  IconScissors,
} from "@tabler/icons-react";

const IconPlayerPlayFilled = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" />
  </svg>
);

const IconPlayerPauseFilled = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
    <path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
  </svg>
);

const Header = ({
  scale,
  setScale,
}: {
  scale: ITimelineScaleState;
  setScale: (scale: ITimelineScaleState) => void;
}) => {
  const currentTimeUs = useStore(projectStore, (s) => s.currentTime);
  const isPlaying = useStore(projectStore, (s) => s.isPlaying);
  const durationUs = useStore(projectStore, (s) => s.settings.duration);
  const currentTime = currentTimeUs / 1_000_000;
  const duration = durationUs / 1_000_000;

  const fps = useStore(projectStore, (s) => s.settings.fps);
  const { selectedClip, isLocked, handleDuplicate, handleDelete } = useClipActions();

  const handleSplit = () => {
    core.clip.split(currentTimeUs);
  };

  const changeScale = (newScale: ITimelineScaleState) => {
    setScale(newScale);
  };

  const handlePlay = () => core.play();
  const handlePause = () => core.pause();
  const handleSeek = (time: number) => core.seek(time * 1_000_000);

  return (
    <div
      id="timeline-header"
      className="relative h-12 flex-none border-b border-border/50  select-none"
    >
      <div className="flex items-center justify-between h-full px-4 text-xs">
        {/* Left: Timeline Navigation & Time Indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSeek(0)}
            className="p-1.5 hover:bg-muted/50 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Start"
          >
            <IconChevronsLeft className="size-4" />
          </button>
          <button
            onClick={() => handleSeek(duration)}
            className="p-1.5 hover:bg-muted/50 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="End"
          >
            <IconChevronsRight className="size-4" />
          </button>

          {/* Time display: 0:05.0 / 0:06.9 */}
          <div className="flex items-center gap-1.5 font-mono text-muted-foreground tabular-nums select-none ml-2">
            <span className="text-foreground font-semibold">
              {frameToTimeString({ frame: Math.floor(currentTime * fps) }, { fps })}
            </span>
            <span>/</span>
            <span>{timeToString({ time: durationUs })}</span>
          </div>
        </div>

        {/* Center: Playback & Action Controls */}
        <div className="flex items-center gap-4">
          {/* Record button */}
          <button className="flex items-center gap-1.5 px-3 py-1 hover:bg-muted/40 rounded text-muted-foreground hover:text-foreground font-medium transition-all">
            <span className="size-2 rounded-full bg-red-500 animate-pulse" />
            <span>Record</span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => {
              if (isPlaying) {
                return handlePause();
              }
              handlePlay();
            }}
            className="p-2 bg-foreground text-background hover:bg-foreground/90 rounded-full flex items-center justify-center transition-colors shadow-sm"
          >
            {isPlaying ? <IconPlayerPauseFilled size={12} /> : <IconPlayerPlayFilled size={12} />}
          </button>

          {/* Speed */}
          <button className="px-2 py-1 hover:bg-muted/40 rounded text-muted-foreground hover:text-foreground font-medium font-mono text-[11px]">
            1x
          </button>

          {/* Split button */}
          <button
            onClick={handleSplit}
            disabled={!selectedClip || isLocked}
            className="flex items-center gap-1.5 px-3 py-1 hover:bg-muted/40 disabled:opacity-25 rounded text-muted-foreground hover:text-foreground font-medium transition-all"
          >
            <IconScissors className="size-3.5" />
            <span>Split</span>
          </button>
        </div>

        {/* Right: Zoom & Layout View Settings */}
        <div className="flex items-center gap-4">
          <ZoomControl scale={scale} onChangeTimelineScale={changeScale} duration={duration} />
        </div>
      </div>
    </div>
  );
};

const ZoomControl = ({
  scale,
  onChangeTimelineScale,
  duration,
}: {
  scale: ITimelineScaleState;
  onChangeTimelineScale: (scale: ITimelineScaleState) => void;
  duration: number;
}) => {
  const timelineOffsetX = useTimelineOffsetX();
  const { selectedClip } = useClipActions();

  const onZoomOutClick = () => {
    const newZoom = Math.max(0.1, scale.zoom - 0.15);
    onChangeTimelineScale({ ...scale, zoom: newZoom });
  };

  const onZoomInClick = () => {
    const newZoom = Math.min(10, scale.zoom + 0.15);
    onChangeTimelineScale({ ...scale, zoom: newZoom });
  };

  const onZoomSetClick = (zoomVal: number) => {
    onChangeTimelineScale({ ...scale, zoom: zoomVal });
  };

  const onZoomFitClick = () => {
    const fitZoom = getFitZoomLevel(duration * 1_000_000, scale.zoom, timelineOffsetX);
    onChangeTimelineScale(fitZoom);
  };

  const onZoomFitCurrentSceneClick = () => {
    let fitDurationUs = duration * 1_000_000;
    if (selectedClip && selectedClip.display) {
      fitDurationUs = selectedClip.display.to - selectedClip.display.from;
    }
    const fitZoom = getFitZoomLevel(fitDurationUs, scale.zoom, timelineOffsetX);
    onChangeTimelineScale(fitZoom);
  };

  const onZoomToPlayheadClick = () => {
    onChangeTimelineScale({ ...scale, zoom: 2.0 });
  };

  return (
    <div className="flex items-center gap-1 select-none">
      <button
        onClick={onZoomOutClick}
        className="p-1 hover:bg-muted/50 rounded text-muted-foreground hover:text-foreground transition-colors"
        title="Zoom Out"
      >
        <IconMinus className="size-3.5" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer min-w-[36px] text-center select-none tabular-nums px-1 py-0.5 rounded hover:bg-muted/30">
            {Math.round(scale.zoom * 100)}%
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 bg-zinc-950 border border-white/10 text-zinc-200"
        >
          <DropdownMenuItem
            onClick={onZoomInClick}
            className="cursor-pointer flex justify-between items-center text-xs py-1.5"
          >
            <span>Zoom in</span>
            <DropdownMenuShortcut className="text-[10px] text-muted-foreground">
              ⌘=
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onZoomOutClick}
            className="cursor-pointer flex justify-between items-center text-xs py-1.5"
          >
            <span>Zoom out</span>
            <DropdownMenuShortcut className="text-[10px] text-muted-foreground">
              ⌘-
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onZoomSetClick(1)}
            className="cursor-pointer flex justify-between items-center text-xs py-1.5"
          >
            <span>100%</span>
            <DropdownMenuShortcut className="text-[10px] text-muted-foreground">
              ⌘0
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onZoomFitClick}
            className="cursor-pointer flex justify-between items-center text-xs py-1.5"
          >
            <span>Fit in view</span>
            <DropdownMenuShortcut className="text-[10px] text-muted-foreground">
              ⌥⌘1
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onZoomFitCurrentSceneClick}
            className="cursor-pointer flex justify-between items-center text-xs py-1.5"
          >
            <span>Fit current scene</span>
            <DropdownMenuShortcut className="text-[10px] text-muted-foreground">
              ⌥⌘2
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onZoomToPlayheadClick}
            className="cursor-pointer flex justify-between items-center text-xs py-1.5"
          >
            <span>Zoom to playhead</span>
            <DropdownMenuShortcut className="text-[10px] text-muted-foreground">
              ⌥⌘3
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        onClick={onZoomInClick}
        className="p-1 hover:bg-muted/50 rounded text-muted-foreground hover:text-foreground transition-colors"
        title="Zoom In"
      >
        <IconPlus className="size-3.5" />
      </button>
    </div>
  );
};

export default Header;
