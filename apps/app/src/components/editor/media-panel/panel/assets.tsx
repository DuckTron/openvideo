"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStudioStore } from "@/stores/studio-store";
import { core } from "@/lib/project";
import {
  IconSearch,
  IconTrash,
  IconMusic,
  IconLoader2,
  IconPhoto,
  IconInfoCircle,
  IconFilter,
  IconVideo,
  IconPlus,
  IconFile,
  IconClock,
  IconLink,
  IconRefresh,
  IconUpload,
  IconSparkles,
  IconDots,
  IconLayoutGrid,
  IconList,
  IconCheck,
  IconFolder,
} from "@tabler/icons-react";
import type { MediaType } from "@/types/media";
import { useAssetUpload } from "@/hooks/use-asset-upload";
import { trpc } from "@/lib/trpc";
import Draggable from "@/components/shared/draggable";
import { AssetGeneratorModal } from "../asset-generator-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectStore } from "@/stores/project-store";
import { useAssetsStore, type ProjectFile } from "@/stores/assets-store";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisualAsset {
  id: string;
  type: MediaType;
  src: string;
  thumbnailSrc?: string | null;
  name: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  indexingStatus?: "pending" | "processing" | "completed" | "failed" | null;
  indexingProgress?: number | null;
  indexingStage?: string | null;
  indexingError?: string | null;
  uploadProgress?: number | null;
  startMs?: number;
  endMs?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds?: number) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatBytes(bytes?: number) {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return "Unknown size";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function getMediaDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const type = file.type.toLowerCase();
    if (type.startsWith("audio/")) {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audio.src);
      };
      audio.onerror = () => resolve(undefined);
    } else if (type.startsWith("video/")) {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => resolve(undefined);
    } else {
      resolve(undefined);
    }
  });
}

function buildDraggableData(asset: VisualAsset) {
  const typeMap: Record<MediaType, string> = { image: "Image", video: "Video", audio: "Audio" };
  return {
    type: typeMap[asset.type],
    src: asset.src,
    name: asset.name,
    ...(asset.width && { width: asset.width }),
    ...(asset.height && { height: asset.height }),
    ...(asset.duration && { duration: asset.duration * 1e6 }),
    ...(asset.type === "video" &&
      asset.thumbnailSrc && {
        metadata: {
          previewUrl: asset.thumbnailSrc,
        },
      }),
  };
}

// ─── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({
  asset,
  onAdd,
  onSelect,
  onDelete,
  onDownload,
}: {
  asset: VisualAsset;
  onAdd: (asset: VisualAsset) => void;
  onSelect: (asset: VisualAsset) => void;
  onDelete: (id: string) => void;
  onDownload: (asset: VisualAsset) => void;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { studio } = useStudioStore();
  const draggableData = buildDraggableData(asset);
  const isInUse = studio?.clips?.some((clip: any) => clip.src === asset.src);

  const preview =
    asset.type === "image" ? (
      <div className="w-20 aspect-square rounded-md overflow-hidden shadow-xl border-2 border-primary">
        <img src={asset.thumbnailSrc || asset.src} className="w-full h-full object-cover" />
      </div>
    ) : asset.type === "video" ? (
      <div className="w-20 aspect-video rounded-md overflow-hidden shadow-xl border-2 border-primary bg-background">
        {asset.thumbnailSrc ? (
          <img src={asset.thumbnailSrc} className="w-full h-full object-cover" />
        ) : (
          <video src={asset.src} className="w-full h-full object-cover" muted />
        )}
      </div>
    ) : (
      <div className="w-20 aspect-square rounded-md overflow-hidden shadow-xl border-2 border-primary bg-secondary flex items-center justify-center">
        <IconMusic size={24} className="text-primary" />
      </div>
    );

  const isTemp = asset.id.startsWith("temp_");
  const isUploading =
    isTemp ||
    (asset.uploadProgress !== undefined &&
      asset.uploadProgress !== null &&
      asset.uploadProgress < 100);
  const showPreview =
    (asset.type === "image" || asset.type === "video") &&
    asset.src &&
    !isTemp &&
    asset.uploadProgress == null; // don't render until bytes are in R2

  const formatStage = (stage: string | null | undefined) => {
    if (!stage) return "Indexing";
    return stage.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <Draggable data={draggableData} renderCustomPreview={preview}>
      <div
        className="flex flex-col gap-1.5 group cursor-pointer"
        onClick={() => !isTemp && onSelect(asset)}
      >
        <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary/30 border border-border/40 group-hover:border-border transition-all duration-200 flex items-center justify-center select-none shadow-sm group-hover:shadow-md group-hover:scale-[1.02]">
          {/* Media Type Icon & In Use Badge (Top Left) */}
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10">
            <div className="p-1 rounded-md bg-background/80 backdrop-blur-md text-foreground flex items-center justify-center pointer-events-none">
              {asset.type === "image" && <IconPhoto size={11} strokeWidth={2.5} />}
              {asset.type === "video" && <IconVideo size={11} strokeWidth={2.5} />}
              {asset.type === "audio" && <IconMusic size={11} strokeWidth={2.5} />}
            </div>
            {isInUse && (
              <div className="px-1.5 py-0.5 rounded-md bg-primary text-[8px] text-primary-foreground font-semibold">
                In Use
              </div>
            )}
          </div>

          {showPreview ? (
            asset.type === "image" ? (
              <img
                src={asset.thumbnailSrc || asset.src}
                alt={asset.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-background/60">
                {asset.thumbnailSrc ? (
                  <img
                    src={asset.thumbnailSrc}
                    alt={asset.name}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                ) : (
                  <video
                    src={asset.src}
                    className="w-full h-full object-cover pointer-events-none"
                    muted
                    onMouseOver={(e) => (e.currentTarget as HTMLVideoElement).play()}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLVideoElement).pause();
                      (e.currentTarget as HTMLVideoElement).currentTime = 0;
                    }}
                  />
                )}
              </div>
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/20 relative gap-1.5 px-3">
              {asset.type === "audio" && !isTemp && (
                <div className="flex items-center gap-0.5 h-8 px-2 opacity-40">
                  <span className="w-[1.5px] h-2 bg-foreground/45 rounded-full" />
                  <span className="w-[1.5px] h-4 bg-foreground/45 rounded-full" />
                  <span className="w-[1.5px] h-6 bg-foreground/60 rounded-full" />
                  <span className="w-[1.5px] h-3 bg-foreground/50 rounded-full" />
                  <span className="w-[1.5px] h-5 bg-foreground/70 rounded-full" />
                  <span className="w-[1.5px] h-7 bg-foreground rounded-full" />
                  <span className="w-[1.5px] h-5 bg-foreground/80 rounded-full" />
                  <span className="w-[1.5px] h-6 bg-foreground/60 rounded-full" />
                  <span className="w-[1.5px] h-4 bg-foreground/50 rounded-full" />
                  <span className="w-[1.5px] h-5 bg-foreground/70 rounded-full" />
                  <span className="w-[1.5px] h-2 bg-foreground/45 rounded-full" />
                </div>
              )}

              {/* Uploading Status Overlay */}
              {isUploading ? (
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <IconLoader2 className="animate-spin text-primary size-5" />
                  <div className="text-[10px] font-semibold text-muted-foreground text-center">
                    {asset.uploadProgress !== undefined && asset.uploadProgress !== null ? (
                      asset.uploadProgress === 100 ? (
                        <span className="animate-pulse">Finalizing...</span>
                      ) : (
                        `Uploading ${asset.uploadProgress}%`
                      )
                    ) : (
                      "Uploading..."
                    )}
                  </div>
                  {asset.uploadProgress !== undefined &&
                    asset.uploadProgress !== null &&
                    asset.uploadProgress < 100 && (
                      <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${asset.uploadProgress}%` }}
                        />
                      </div>
                    )}
                </div>
              ) : asset.indexingStatus === "failed" ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center gap-1">
                        <Badge
                          variant="destructive"
                          className="text-[9px] h-4 px-1.5 gap-1 hover:bg-destructive"
                        >
                          <IconInfoCircle size={10} />
                          Failed
                        </Badge>
                        <span className="text-[9px] text-destructive max-w-[80px] truncate text-center">
                          {asset.indexingError || "Error indexing"}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover border border-border text-foreground p-2 rounded-lg max-w-[200px] text-xs">
                      {asset.indexingError ||
                        "An error occurred during indexing pipeline processing."}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : asset.indexingStatus === "completed" /* No badge for completed audio */ ? null : (
                /* Simplified to just "Analyzing" for all indexing states */
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <IconLoader2 className="animate-spin text-amber-500 size-4" />
                  <div className="text-[10px] font-semibold text-muted-foreground text-center">
                    Analyzing
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Indexing status overlay (on preview) */}
          {showPreview && asset.indexingStatus !== "completed" && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center z-20 px-3">
              {asset.indexingStatus === "failed" ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center gap-1">
                        <Badge
                          variant="destructive"
                          className="text-[9px] h-5 px-2 gap-1 hover:bg-destructive"
                        >
                          <IconInfoCircle size={10} />
                          Failed
                        </Badge>
                        <span className="text-[9px] text-destructive-foreground/85 max-w-[80px] truncate text-center font-medium">
                          {asset.indexingError || "Error indexing"}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover border border-border text-foreground p-2 rounded-lg max-w-[200px] text-xs">
                      {asset.indexingError ||
                        "An error occurred during indexing pipeline processing."}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                /* Simplified to just "Analyzing" for all indexing states */
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <IconLoader2 className="animate-spin text-amber-500 size-4" />
                  <div className="text-[10px] font-semibold text-white/90 text-center">
                    Analyzing
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Duration Badge & Info Button */}
          {(asset.type === "video" || asset.type === "audio") && asset.duration && (
            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 z-10">
              <span className="px-1.5 py-0.5 rounded-md bg-background/80 backdrop-blur-md text-[9px] text-foreground font-semibold">
                {formatDuration(asset.duration)}
              </span>
            </div>
          )}

          {/* Hover Action Buttons */}
          {!isTemp && (
            <>
              {/* More Options Dropdown */}
              <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-background/80 backdrop-blur-md opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-all duration-200 hover:bg-secondary hover:text-foreground hover:scale-110 z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconDots size={12} className="text-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32 py-2">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(asset);
                    }}
                    className="text-sm cursor-pointer"
                  >
                    Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(asset);
                    }}
                    className="text-sm cursor-pointer"
                  >
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(asset.id);
                    }}
                    className="text-sm text-destructive cursor-pointer"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Add/Plus Button (Bottom Right) */}
              <button
                type="button"
                className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary/90 hover:scale-110 z-20 shadow-md flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(asset);
                }}
              >
                <IconPlus size={10} strokeWidth={3} />
              </button>
            </>
          )}
        </div>
        {/* Visual label for asset names below cards */}
        <div className="px-1 truncate text-[11px] text-muted-foreground group-hover:text-foreground transition-colors duration-200 font-medium text-center font-sans">
          {asset.name}
        </div>
      </div>
    </Draggable>
  );
}

// ─── Asset List Row ───────────────────────────────────────────────────────────

function AssetListRow({
  asset,
  onAdd,
  onSelect,
  onDelete,
  onDownload,
}: {
  asset: VisualAsset;
  onAdd: (asset: VisualAsset) => void;
  onSelect: (asset: VisualAsset) => void;
  onDelete: (id: string) => void;
  onDownload: (asset: VisualAsset) => void;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { studio } = useStudioStore();
  const draggableData = buildDraggableData(asset);
  const isInUse = studio?.clips?.some((clip: any) => clip.src === asset.src);

  const preview =
    asset.type === "image" ? (
      <div className="w-10 aspect-square rounded overflow-hidden shadow border border-primary">
        <img src={asset.thumbnailSrc || asset.src} className="w-full h-full object-cover" />
      </div>
    ) : asset.type === "video" ? (
      <div className="w-10 aspect-video rounded overflow-hidden shadow border border-primary bg-background">
        {asset.thumbnailSrc ? (
          <img src={asset.thumbnailSrc} className="w-full h-full object-cover" />
        ) : (
          <video src={asset.src} className="w-full h-full object-cover" muted />
        )}
      </div>
    ) : (
      <div className="w-10 aspect-square rounded overflow-hidden shadow border border-primary bg-secondary flex items-center justify-center">
        <IconMusic size={14} className="text-primary" />
      </div>
    );

  const isTemp = asset.id.startsWith("temp_");
  const isUploading =
    isTemp ||
    (asset.uploadProgress !== undefined &&
      asset.uploadProgress !== null &&
      asset.uploadProgress < 100);
  const showPreview =
    (asset.type === "image" || asset.type === "video") &&
    asset.src &&
    !isTemp &&
    asset.uploadProgress == null;

  return (
    <Draggable data={draggableData} renderCustomPreview={preview}>
      <div
        className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-accent/40 group cursor-pointer transition-all duration-200"
        onClick={() => !isTemp && onSelect(asset)}
      >
        {/* Left: Thumbnail/Icon */}
        <div className="relative size-8 rounded-md overflow-hidden bg-zinc-950/40 border border-border/40 flex items-center justify-center shrink-0">
          {showPreview ? (
            asset.type === "image" ? (
              <img
                src={asset.thumbnailSrc || asset.src}
                alt={asset.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={asset.thumbnailSrc || asset.src}
                alt={asset.name}
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {asset.type === "image" && <IconPhoto size={14} className="text-muted-foreground" />}
              {asset.type === "video" && <IconVideo size={14} className="text-muted-foreground" />}
              {asset.type === "audio" && <IconMusic size={14} className="text-muted-foreground" />}
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <IconLoader2 className="animate-spin text-primary size-3.5" />
            </div>
          )}
        </div>

        {/* Center: File Info */}
        <div className="min-w-0 flex-1">
          <div className="text-xs text-foreground font-sans font-medium truncate group-hover:text-foreground transition-colors">
            {asset.name}
          </div>
          {asset.duration && (
            <div className="text-[10px] text-muted-foreground/85 font-mono mt-0.5">
              {formatDuration(asset.duration)}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        {!isTemp && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd(asset);
              }}
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Add to Canvas"
            >
              <IconPlus size={13} strokeWidth={2.5} />
            </button>

            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <IconDots size={13} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 py-1.5">
                <DropdownMenuItem
                  onClick={() => onSelect(asset)}
                  className="cursor-pointer text-xs"
                >
                  Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDownload(asset)}
                  className="cursor-pointer text-xs"
                >
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(asset.id)}
                  className="text-destructive cursor-pointer text-xs"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </Draggable>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface PanelAssetsProps {
  showHeader?: boolean;
  showGenerator?: boolean;
}

export default function PanelAssets({ showHeader = true, showGenerator = true }: PanelAssetsProps) {
  const spaceId = useProjectStore((state) => state.spaceId);
  const files = useAssetsStore((state) => state.files);
  const setFiles = useAssetsStore((state) => state.setFiles);
  const updateFile = useAssetsStore((state) => state.updateFile);
  const removeFile = useAssetsStore((state) => state.removeFile);
  const isAssetsStoreLoading = useAssetsStore((state) => state.isLoading);
  const setAssetsStoreLoading = useAssetsStore((state) => state.setIsLoading);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "image" | "video" | "audio">("all");
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const router = useRouter();

  // tRPC compositions list query and creation mutation
  const { data: spaces } = trpc.space.list.useQuery();
  const createSpace = trpc.space.create.useMutation();
  const trpcUtils = trpc.useUtils();

  const handleCreateComposition = async () => {
    const name = prompt("Enter composition name:");
    if (!name) return;
    try {
      const newSpace = await createSpace.mutateAsync({ name });
      await trpcUtils.space.list.invalidate();
      router.push(`/edit/${newSpace.id}`);
    } catch (err) {
      console.error("Failed to create composition:", err);
    }
  };

  // AI Semantic Search State
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce semantic search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // tRPC asset queries and mutations
  const { data: assetsData, refetch: refetchAssets } = trpc.asset.list.useQuery(
    { spaceId: spaceId ?? "" },
    { enabled: !!spaceId },
  );

  const { data: semanticResults, isFetching: isSemanticFetching } =
    trpc.asset.semanticSearch.useQuery(
      {
        spaceId: spaceId ?? "",
        query: debouncedQuery,
      },
      {
        enabled: isSemanticMode && debouncedQuery.trim().length >= 3 && !!spaceId,
      },
    );

  const deleteAsset = trpc.asset.delete.useMutation();
  const triggerIndex = trpc.asset.triggerIndex.useMutation();

  // Load files when data changes
  useEffect(() => {
    if (assetsData) {
      const projectFiles: ProjectFile[] = assetsData.map((asset: any) => ({
        id: asset.id,
        spaceId: asset.spaceId || spaceId,
        name: asset.name,
        type: asset.type as any,
        src: asset.src,
        thumbnailSrc: asset.thumbnailSrc ?? null,
        duration: asset.duration,
        size: asset.size,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        indexingStatus: asset.indexingStatus?.status ?? null,
        indexingProgress: asset.indexingStatus?.progress ?? null,
        indexingStage: asset.indexingStatus?.stage ?? null,
        indexingError: asset.indexingStatus?.error ?? null,
      }));
      setFiles(projectFiles);
      setAssetsStoreLoading(false);
      setIsLoaded(true);
    }
  }, [assetsData, spaceId, setFiles, setAssetsStoreLoading]);

  // Load uploads on mount
  useEffect(() => {
    if (!spaceId) {
      setAssetsStoreLoading(false);
      setIsLoaded(true);
    }
  }, [spaceId, setAssetsStoreLoading]);

  // Real-time polling for indexing/conform status of in-flight files
  useEffect(() => {
    const inFlight = files.filter(
      (f) =>
        !f.id.startsWith("temp_") &&
        (f.indexingStatus === "pending" || f.indexingStatus === "processing"),
    );
    if (inFlight.length === 0) return;

    const validFiles = inFlight.filter((f) => f.spaceId);
    if (validFiles.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        // Refetch all assets to get updated indexing status
        const { data: freshAssets } = await refetchAssets();
        if (freshAssets) {
          freshAssets.forEach((asset: any) => {
            // Use workflow processingStatus for display, fallback to indexing status
            const processingStatus = asset.indexingStatus?.processingStatus;
            const indexingStatus = asset.indexingStatus?.status;

            // Determine display status:
            // - uploading: client-side only (while uploadProgress exists)
            // - conforming: workflow processingStatus
            // - analyzing/indexing: workflow processingStatus or indexing status
            // - completed: both completed
            let displayStatus = null;
            let displayStage = null;

            if (processingStatus === "conforming") {
              displayStatus = "processing";
              displayStage = "conforming";
            } else if (processingStatus === "indexing" || indexingStatus === "processing") {
              displayStatus = "processing";
              displayStage = "analyzing";
            } else if (processingStatus === "failed" || indexingStatus === "failed") {
              displayStatus = "failed";
            } else if (processingStatus === "completed" || indexingStatus === "completed") {
              displayStatus = "completed";
            } else if (indexingStatus === "pending") {
              displayStatus = "pending";
            }

            updateFile(asset.id, {
              src: asset.src,
              indexingStatus: displayStatus as
                | "pending"
                | "processing"
                | "completed"
                | "failed"
                | null,
              indexingProgress: asset.indexingStatus?.progress ?? null,
              indexingStage: displayStage as "conforming" | "analyzing" | null,
              indexingError: asset.indexingStatus?.error ?? null,
            });
          });
        }
      } catch {
        // silently skip — next tick will retry
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [files, updateFile, refetchAssets]);

  // Listen to asset generation event to refresh list
  useEffect(() => {
    const handleAssetGenerated = () => {
      refetchAssets();
    };
    window.addEventListener("asset-generated", handleAssetGenerated);
    return () => {
      window.removeEventListener("asset-generated", handleAssetGenerated);
    };
  }, [refetchAssets]);

  const { uploadFiles, isUploading } = useAssetUpload({
    spaceId,
    onComplete: () => {
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(e.target.files);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!spaceId) return;
    try {
      const file = files.find((f) => f.id === id);

      await Promise.all([
        deleteAsset.mutateAsync({ id, spaceId }),
        file?.src && !file.src.startsWith("blob:")
          ? fetch("/api/uploads", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ src: file.src }),
            })
          : Promise.resolve(),
      ]);

      removeFile(id);
    } catch (error) {
      console.error("Failed to delete upload:", error);
    }
  };

  // Handle download
  const handleDownload = async (asset: VisualAsset) => {
    try {
      const link = document.createElement("a");
      link.href = asset.src;
      link.download = asset.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download asset:", error);
    }
  };

  // Add item to canvas on click
  const addItemToCanvas = async (asset: VisualAsset) => {
    try {
      const typeMap: Record<MediaType, string> = { image: "Image", video: "Video", audio: "Audio" };
      const clipData: any = {
        type: typeMap[asset.type] as any,
        src: asset.src,
        name: asset.name,
      };

      if (asset.type === "video" && asset.thumbnailSrc) {
        clipData.metadata = {
          previewUrl: asset.thumbnailSrc,
        };
      }

      // If this asset has a startMs and endMs from semantic search, trim it!
      if (
        (asset.type === "video" || asset.type === "audio") &&
        asset.startMs !== undefined &&
        asset.endMs !== undefined
      ) {
        const startSec = asset.startMs / 1000;
        const endSec = asset.endMs / 1000;
        clipData.timing = {
          trim: { from: startSec * 1e6, to: endSec * 1e6 },
          duration: (endSec - startSec) * 1e6,
        };
      }

      await core.clip.add(clipData, { objectFit: "contain" });
    } catch (error) {
      console.error("Failed to add clip:", error);
    }
  };

  // Map Zustand files to VisualAsset interface for rendering compatibility
  const mappedAssets: VisualAsset[] = files.map((f) => ({
    id: f.id,
    type: f.type,
    src: f.src,
    thumbnailSrc: f.thumbnailSrc,
    name: f.name,
    duration: f.duration,
    size: f.size,
    indexingStatus: f.indexingStatus,
    indexingProgress: f.indexingProgress,
    indexingStage: f.indexingStage,
    indexingError: f.indexingError,
    uploadProgress: f.uploadProgress,
  }));

  const selectedAsset = mappedAssets.find((a) => a.id === selectedAssetId) || null;

  const filteredAssets = mappedAssets.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || a.type === filterType;
    return matchesSearch && matchesFilter;
  });

  if (!isLoaded || isAssetsStoreLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <IconLoader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-background p-2 gap-4 overflow-hidden select-none">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/*,audio/*"
        multiple
        onChange={handleFileUpload}
      />

      {/* Header Row */}
      <div className="flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 text-sm font-medium  text-foreground px-2">
          <IconFolder className="size-4.5 text-foreground/80" />
          <span>Assets</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 gap-1.5 px-2.5 text-xs hover:bg-secondary/40 transition-colors"
        >
          <IconUpload className="size-3.5" />
          <span>Upload</span>
        </Button>
      </div>

      {/* Files Card */}
      <div className="bg-card border border-border/40 rounded-xl p-3.5 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <span className="text-xs font-sans font-semibold text-muted-foreground">Files</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 hover:bg-accent/60 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Upload Files"
          >
            <IconPlus className="size-3.5" />
          </button>
        </div>

        {/* Search, Filter, ViewMode Actions Row */}
        <div className="flex items-center gap-1.5 mb-3 shrink-0">
          <div className="relative flex-1 min-w-0">
            <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground animate-none" />
            <input
              placeholder={isSemanticMode ? "Find quotes or topics..." : "Search your files"}
              className="w-full h-8 pl-8 pr-2 text-xs bg-zinc-950/40 border border-border/40 rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-border transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* AI Semantic Sparkles Toggle */}
          <button
            onClick={() => setIsSemanticMode(!isSemanticMode)}
            className={cn(
              "p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-center h-8 w-8 shrink-0",
              isSemanticMode
                ? "bg-violet-600/20 border-violet-500/40 text-violet-400 hover:bg-violet-600/30"
                : "bg-zinc-950/40 border-border/40 text-muted-foreground hover:text-foreground hover:bg-zinc-800/40",
            )}
            title="AI Semantic Search"
          >
            <IconSparkles className="size-3.5" />
          </button>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 bg-zinc-950/40 border border-border/40 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-800/40 transition-colors cursor-pointer h-8 w-8 shrink-0 flex items-center justify-center">
                <IconFilter className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {[
                { value: "all", label: "All Assets" },
                { value: "image", label: "Images" },
                { value: "video", label: "Videos" },
                { value: "audio", label: "Audio" },
              ].map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setFilterType(option.value as any)}
                  className="flex items-center justify-between px-3 py-2 text-[13px] font-medium hover:bg-secondary/50 rounded-lg cursor-pointer"
                >
                  <span>{option.label}</span>
                  {filterType === option.value && (
                    <div className="size-1.5 rounded-full bg-foreground" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Grid/List layout toggle */}
          <button
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="p-1.5 bg-zinc-950/40 border border-border/40 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-800/40 transition-colors cursor-pointer h-8 w-8 shrink-0 flex items-center justify-center"
            title={viewMode === "grid" ? "Switch to List View" : "Switch to Grid View"}
          >
            {viewMode === "grid" ? (
              <IconList className="size-3.5" />
            ) : (
              <IconLayoutGrid className="size-3.5" />
            )}
          </button>
        </div>

        {/* Assets List/Grid Scroll Area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {files.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center select-none">
              <div className="mb-4 text-muted-foreground/60">
                <IconFolder size={24} strokeWidth={1.5} />
              </div>
              <div className="text-xs text-muted-foreground/80 leading-relaxed font-medium">
                Drag & drop or click to{" "}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="underline text-foreground hover:text-primary transition-colors font-medium cursor-pointer"
                >
                  add files
                </button>
              </div>
            </div>
          ) : isSemanticMode && searchQuery.trim().length >= 3 ? (
            /* AI Semantic Search Results */
            <ScrollArea className="flex-1 pr-1.5">
              {isSemanticFetching ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <IconLoader2 className="animate-spin text-violet-500" size={20} />
                  <span className="text-[11px]">Searching with Gemini...</span>
                </div>
              ) : !semanticResults || semanticResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-1.5 text-muted-foreground text-center">
                  <IconSparkles size={24} className="text-violet-500 opacity-40 animate-pulse" />
                  <span className="text-xs font-semibold text-foreground/80">No AI matches</span>
                  <p className="text-[10px] max-w-[180px]">
                    Try keywords or phrases mentioned in assets.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pb-4">
                  {semanticResults.map((result: any) => {
                    const minutes = Math.floor((result.startMs || 0) / 60000);
                    const seconds = Math.floor(((result.startMs || 0) % 60000) / 1000);
                    const timestampStr =
                      result.startMs !== undefined && result.endMs !== undefined
                        ? `${minutes}:${seconds.toString().padStart(2, "0")} - ${Math.floor(
                            result.endMs / 60000,
                          )}:${Math.floor((result.endMs % 60000) / 1000)
                            .toString()
                            .padStart(2, "0")}`
                        : "";

                    const parentFile = files.find((f) => f.id === result.assetId);
                    const visualAsset: VisualAsset = {
                      id: result.assetId,
                      type: result.assetType as any,
                      src: result.src,
                      name: result.assetName,
                      thumbnailSrc: parentFile?.thumbnailSrc,
                    };

                    const percentageScore = Math.round((result.score || 0) * 100);

                    return (
                      <div
                        key={`${result.assetId}-${result.startMs}-${result.endMs}`}
                        className="group flex flex-col gap-1.5 p-2 bg-secondary/10 hover:bg-secondary/20 border border-border/40 hover:border-violet-500/20 rounded-lg transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden"
                        onClick={() => setSelectedAssetId(result.assetId)}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative size-8 rounded overflow-hidden bg-background shrink-0 flex items-center justify-center border border-border/50">
                            {result.assetType === "image" ? (
                              <img
                                src={visualAsset.thumbnailSrc || result.src}
                                className="w-full h-full object-cover"
                              />
                            ) : result.assetType === "video" ? (
                              visualAsset.thumbnailSrc ? (
                                <img
                                  src={visualAsset.thumbnailSrc}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <video
                                  src={result.src}
                                  className="w-full h-full object-cover"
                                  muted
                                />
                              )
                            ) : (
                              <IconMusic size={14} className="text-violet-500" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-semibold text-foreground truncate">
                              {result.assetName}
                            </h4>
                            {timestampStr && (
                              <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground/85 mt-0.5 font-mono">
                                <IconClock size={8} />
                                <span>{timestampStr}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {result.matchedText && (
                          <div className="text-[10px] text-muted-foreground bg-background/20 p-1.5 rounded italic border-l border-violet-500/30 line-clamp-1">
                            "{result.matchedText}"
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-0.5 pt-1 border-t border-border/10">
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-6 px-1.5 text-[9px] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 gap-0.5 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssetId(result.assetId);
                            }}
                          >
                            <IconInfoCircle size={10} />
                            Details
                          </Button>

                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-6 px-1.5 text-[9px] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 gap-0.5 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              addItemToCanvas({
                                ...visualAsset,
                                startMs: result.startMs,
                                endMs: result.endMs,
                              });
                            }}
                          >
                            <IconPlus size={10} strokeWidth={2.5} />
                            Add Segment
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          ) : (
            /* Standard Grid or List View */
            <ScrollArea className="flex-1 pr-1.5">
              {isSemanticMode && searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
                <div className="text-[10px] text-amber-500 font-medium mb-2 px-1 py-1 bg-amber-500/5 border border-amber-500/15 rounded text-center">
                  Type 3+ characters...
                </div>
              )}
              {filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-1.5 text-muted-foreground">
                  <IconPhoto size={20} className="opacity-40" />
                  <span className="text-xs">No matches found.</span>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(85px,1fr))] gap-2.5 pb-4">
                  {filteredAssets.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      onAdd={addItemToCanvas}
                      onSelect={(asset) => setSelectedAssetId(asset.id)}
                      onDelete={handleDelete}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 pb-4">
                  {filteredAssets.map((asset) => (
                    <AssetListRow
                      key={asset.id}
                      asset={asset}
                      onAdd={addItemToCanvas}
                      onSelect={(asset) => setSelectedAssetId(asset.id)}
                      onDelete={handleDelete}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </div>
      {/* Asset Generator Modal */}
      <AssetGeneratorModal open={isGeneratorModalOpen} onOpenChange={setIsGeneratorModalOpen} />

      {/* Asset Preview & Details Dialog Modal */}
      <Dialog
        open={selectedAssetId !== null}
        onOpenChange={(open) => !open && setSelectedAssetId(null)}
      >
        <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden bg-popover">
          <DialogHeader className="sr-only">
            <DialogTitle>Asset Preview: {selectedAsset?.name}</DialogTitle>
            <DialogDescription>Preview and manage asset details</DialogDescription>
          </DialogHeader>

          {selectedAsset && (
            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] min-h-[480px] max-h-[680px]">
              {/* Left Column: Preview */}
              <div className="bg-black/40 flex items-center justify-center p-6 min-h-[420px] max-h-[500px]">
                {selectedAsset.type === "image" && (
                  <img
                    src={selectedAsset.src}
                    alt={selectedAsset.name}
                    className="max-w-full max-h-[420px] object-contain rounded-md shadow-xl"
                  />
                )}
                {selectedAsset.type === "video" && (
                  <video
                    src={selectedAsset.src}
                    controls
                    className="max-w-full max-h-[420px] object-contain rounded-md shadow-xl"
                  />
                )}
                {selectedAsset.type === "audio" && (
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <IconMusic size={28} className="text-primary" />
                    </div>
                    <audio src={selectedAsset.src} controls className="w-48" />
                  </div>
                )}
              </div>

              {/* Right Column: Details & Actions */}
              <div className="p-5 flex flex-col gap-4 border-l border-border">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      {selectedAsset.type}
                    </Badge>
                    {selectedAsset.indexingStatus === "completed" &&
                      selectedAsset.type !== "audio" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        >
                          Ready
                        </Badge>
                      )}
                    {selectedAsset.indexingStatus === "failed" && (
                      <Badge variant="destructive" className="text-[10px]">
                        Failed
                      </Badge>
                    )}
                    {(selectedAsset.indexingStatus === "pending" ||
                      selectedAsset.indexingStatus === "processing") && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20"
                      >
                        {selectedAsset.indexingStatus === "pending" ? "Queued" : "Processing"}
                      </Badge>
                    )}
                  </div>

                  <h2 className="text-lg font-semibold break-all leading-tight">
                    {selectedAsset.name}
                  </h2>
                </div>

                <Separator />

                {/* Metadata */}
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <IconFile size={14} />
                      File Size
                    </span>
                    <span className="font-medium font-mono">{formatBytes(selectedAsset.size)}</span>
                  </div>

                  {selectedAsset.duration && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <IconClock size={14} />
                        Duration
                      </span>
                      <span className="font-medium font-mono">
                        {formatDuration(selectedAsset.duration)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <IconLink size={14} />
                      Source
                    </span>
                    <a
                      href={selectedAsset.src}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline text-xs font-mono truncate max-w-[140px]"
                    >
                      Open Link
                    </a>
                  </div>
                </div>

                {/* Status */}
                {selectedAsset.indexingStatus !== "completed" && (
                  <Alert
                    variant={selectedAsset.indexingStatus === "failed" ? "destructive" : "default"}
                    className={
                      selectedAsset.indexingStatus === "failed"
                        ? ""
                        : "border-amber-500/20 bg-amber-500/5"
                    }
                  >
                    <AlertTitle className="text-xs flex items-center gap-2">
                      {selectedAsset.indexingStatus === "failed" ? (
                        <>
                          <IconInfoCircle size={12} />
                          Indexing Failed
                        </>
                      ) : (
                        <>
                          <IconLoader2 size={12} className="animate-spin" />
                          Indexing
                        </>
                      )}
                    </AlertTitle>
                    <AlertDescription className="text-[11px] mt-1">
                      {selectedAsset.indexingStatus === "failed" ? (
                        <span>
                          {selectedAsset.indexingError || "An error occurred during processing."}
                        </span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <span>
                            {selectedAsset.indexingStatus === "pending"
                              ? "Queued for indexing"
                              : selectedAsset.indexingStage
                                ? selectedAsset.indexingStage
                                    .replace(/[_-]/g, " ")
                                    .replace(/\b\w/g, (c) => c.toUpperCase())
                                : "Processing..."}
                          </span>
                          {selectedAsset.indexingProgress !== null &&
                            selectedAsset.indexingProgress !== undefined &&
                            selectedAsset.indexingProgress > 0 && (
                              <Progress value={selectedAsset.indexingProgress} className="h-1" />
                            )}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    className="w-full"
                    onClick={async () => {
                      await addItemToCanvas(selectedAsset);
                      setSelectedAssetId(null);
                    }}
                  >
                    <IconPlus data-icon="inline-start" />
                    Add to Timeline
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        triggerIndex
                          .mutateAsync({ id: selectedAsset.id, spaceId: spaceId || "" })
                          .then(() => updateFile(selectedAsset.id, { indexingStatus: "pending" }))
                          .catch((err) => console.error("Failed to re-index:", err));
                      }}
                      disabled={
                        selectedAsset.indexingStatus === "pending" ||
                        selectedAsset.indexingStatus === "processing"
                      }
                    >
                      <IconRefresh
                        data-icon="inline-start"
                        className={
                          selectedAsset.indexingStatus === "processing" ? "animate-spin" : ""
                        }
                      />
                      Re-index
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={async () => {
                        await handleDelete(selectedAsset.id);
                        setSelectedAssetId(null);
                      }}
                    >
                      <IconTrash data-icon="inline-start" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
