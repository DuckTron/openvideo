"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
} from "@tabler/icons-react";
import { storageService } from "@/lib/storage/storage-service";
import type { MediaType } from "@/types/media";
import { getPresignedConfig, uploadFileWithConfig } from "@/lib/upload-utils";
import { trpc } from "@/lib/trpc";
import Draggable from "@/components/shared/draggable";
import { useGeneratorModalStore } from "@/stores/generator-modal-store";
import { AssetGeneratorExpandable } from "../asset-generator-expandable";
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
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisualAsset {
  id: string;
  type: MediaType;
  src: string;
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectFileType(file: File): MediaType {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext))
    return "audio";
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext))
    return "video";
  return "image";
}

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
  };
}

// ─── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({
  asset,
  onAdd,
  onSelect,
  onDelete,
}: {
  asset: VisualAsset;
  onAdd: (asset: VisualAsset) => void;
  onSelect: (asset: VisualAsset) => void;
  onDelete: (id: string) => void;
}) {
  const { studio } = useStudioStore();
  const draggableData = buildDraggableData(asset);
  const isInUse = studio?.clips?.some((clip: any) => clip.src === asset.src);

  const preview =
    asset.type === "image" ? (
      <div className="w-20 aspect-square rounded-md overflow-hidden shadow-xl border-2 border-primary">
        <img src={asset.src} className="w-full h-full object-cover" />
      </div>
    ) : asset.type === "video" ? (
      <div className="w-20 aspect-video rounded-md overflow-hidden shadow-xl border-2 border-primary bg-background">
        <video src={asset.src} className="w-full h-full object-cover" muted />
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
        <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary/30 border border-border/40 group-hover:border-border transition-all flex items-center justify-center select-none shadow-sm">
          {/* Media Type Icon (Top Left) */}
          <div className="absolute top-1.5 left-1.5 p-1 rounded-md bg-background/80 backdrop-blur-md text-foreground flex items-center justify-center pointer-events-none z-10">
            {asset.type === "image" && <IconPhoto size={11} strokeWidth={2.5} />}
            {asset.type === "video" && <IconVideo size={11} strokeWidth={2.5} />}
            {asset.type === "audio" && <IconMusic size={11} strokeWidth={2.5} />}
          </div>

          {/* In Use Badge (Top Right) */}
          {isInUse && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-primary text-[9px] text-primary-foreground font-semibold z-10">
              In Use
            </div>
          )}

          {showPreview ? (
            asset.type === "image" ? (
              <img src={asset.src} alt={asset.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-background/60">
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
              </div>
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/20 relative gap-1.5 px-3">
              {asset.type === "audio" && !isTemp && (
                <div className="flex items-center gap-0.5 h-8 px-2 opacity-40 mb-2">
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
              ) : asset.indexingStatus === "completed" ? (
                asset.type === "audio" && (
                  <Badge
                    variant="outline"
                    className="text-[9px] h-4 px-1.5 bg-green-500/10 text-green-500 border-green-500/20"
                  >
                    Ready
                  </Badge>
                )
              ) : (
                /* Indexing States (Pending, Processing) */
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <IconLoader2 className="animate-spin text-amber-500 size-4" />
                  <div className="text-[10px] font-semibold text-muted-foreground text-center">
                    {asset.indexingStatus === "pending" ? (
                      <span className="text-muted-foreground/80">Queued</span>
                    ) : (
                      <span>{formatStage(asset.indexingStage)}</span>
                    )}
                  </div>
                  {asset.indexingStatus === "processing" &&
                    asset.indexingProgress !== undefined &&
                    asset.indexingProgress !== null &&
                    asset.indexingProgress > 0 && (
                      <div className="w-full flex flex-col items-center gap-1">
                        <span className="text-[9px] text-muted-foreground">
                          {asset.indexingProgress}%
                        </span>
                        <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${asset.indexingProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
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
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <IconLoader2 className="animate-spin text-amber-500 size-4" />
                  <div className="text-[10px] font-semibold text-white/90 text-center">
                    {asset.indexingStatus === "pending" ? (
                      <span>Queued</span>
                    ) : (
                      <span>{formatStage(asset.indexingStage)}</span>
                    )}
                  </div>
                  {asset.indexingStatus === "processing" &&
                    asset.indexingProgress !== undefined &&
                    asset.indexingProgress !== null &&
                    asset.indexingProgress > 0 && (
                      <div className="w-full flex flex-col items-center gap-1">
                        <span className="text-[9px] text-white/70">{asset.indexingProgress}%</span>
                        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${asset.indexingProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
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
              {/* Delete Button (Top Right) */}
              <button
                type="button"
                className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-background/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(asset.id);
                }}
              >
                <IconTrash size={12} className="text-foreground" />
              </button>

              {/* Add/Plus Button (Bottom Right) */}
              <button
                type="button"
                className="absolute bottom-1.5 right-1.5 p-1.5 rounded-md bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/90 z-20 shadow-md flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(asset);
                }}
              >
                <IconPlus size={11} strokeWidth={3} />
              </button>
            </>
          )}
        </div>
        {/* Visual label for asset names below cards */}
        <div className="px-1 truncate text-[11px] text-muted-foreground group-hover:text-foreground transition-colors font-medium text-center font-sans">
          {asset.name}
        </div>
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
  const addFiles = useAssetsStore((state) => state.addFiles);
  const updateFile = useAssetsStore((state) => state.updateFile);
  const removeFile = useAssetsStore((state) => state.removeFile);
  const isAssetsStoreLoading = useAssetsStore((state) => state.isLoading);
  const setAssetsStoreLoading = useAssetsStore((state) => state.setIsLoading);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "image" | "video" | "audio">("all");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openGenerator = useGeneratorModalStore((state) => state.open);

  const loadStorageStats = useCallback(async () => {
    await storageService.getStorageStats();
  }, []);

  // tRPC asset queries and mutations
  const { data: assetsData, refetch: refetchAssets } = trpc.asset.list.useQuery(
    { spaceId: spaceId ?? "" },
    { enabled: !!spaceId },
  );
  const createAsset = trpc.asset.create.useMutation();
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
      loadStorageStats();
      setAssetsStoreLoading(false);
      setIsLoaded(true);
    }
  }, [assetsData, spaceId, setFiles, loadStorageStats, setAssetsStoreLoading]);

  // Load uploads on mount
  useEffect(() => {
    if (!spaceId) {
      setAssetsStoreLoading(false);
      setIsLoaded(true);
    }
  }, [spaceId, setAssetsStoreLoading]);

  // Real-time polling for indexing status of in-flight files
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
            if (asset.indexingStatus) {
              updateFile(asset.id, {
                indexingStatus: asset.indexingStatus.status ?? null,
                indexingProgress: asset.indexingStatus.progress ?? null,
                indexingStage: asset.indexingStatus.stage ?? null,
                indexingError: asset.indexingStatus.error ?? null,
              });
            } else {
              updateFile(asset.id, {
                indexingStatus: null,
                indexingProgress: null,
                indexingStage: null,
                indexingError: null,
              });
            }
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

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0 || !spaceId) return;
    setIsUploading(true);

    const fileArray = Array.from(uploadedFiles);

    // Create temporary file entries with uploading status
    const tempFiles: ProjectFile[] = fileArray.map((file) => ({
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      spaceId,
      name: file.name,
      type: detectFileType(file),
      src: "",
      duration: undefined,
      size: file.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      indexingStatus: null,
      uploadProgress: 0,
    }));

    addFiles(tempFiles);

    try {
      const uploadPromises = fileArray.map(async (file, index) => {
        const tempId = tempFiles[index].id;
        const type = tempFiles[index].type;
        let currentId = tempId;

        try {
          // 1. Get presigned R2 config — ONE call, reused for both DB registration and upload
          const uploadConfig = await getPresignedConfig(file.name);
          const src = uploadConfig.url; // final public R2 URL
          const duration = await getMediaDuration(file);

          // 2. Register asset in DB with autoIndex: false so we get a real ID immediately
          const newAsset = await createAsset.mutateAsync({
            spaceId,
            name: file.name,
            type,
            src,
            duration,
            size: file.size,
            autoIndex: false,
          });

          // 3. Replace temp placeholder with real asset ID and show uploading state
          currentId = newAsset.id;
          updateFile(tempId, {
            id: newAsset.id,
            src,
            duration,
            uploadProgress: 0,
            indexingStatus: null,
            indexingProgress: null,
            indexingStage: null,
            indexingError: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          if (storageService.isOPFSSupported()) {
            const mediaFile = { id: newAsset.id, file, name: file.name, type, url: src, duration };
            await storageService.saveMediaFile({ projectId: spaceId, mediaItem: mediaFile });
          }

          // 4. Upload bytes to R2 using the SAME presigned config — no second presign!
          await uploadFileWithConfig(file, uploadConfig, (progress) => {
            updateFile(newAsset.id, { uploadProgress: progress });
          });

          // 5. Upload done — clear progress bar, set indexing pending state
          updateFile(newAsset.id, {
            uploadProgress: null,
            indexingStatus: "pending" as const,
          });

          // 6. Kick off indexing in the background (non-blocking)
          triggerIndex.mutateAsync({ id: newAsset.id, spaceId }).catch((err) => {
            console.error(`Failed to trigger index for ${file.name}:`, err);
            updateFile(newAsset.id, { indexingStatus: "failed" });
          });
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          updateFile(currentId, { uploadProgress: null, indexingStatus: "failed" });
        }
      });

      await Promise.all(uploadPromises);
      await loadStorageStats();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
        storageService.isOPFSSupported()
          ? storageService.deleteMediaFile({ projectId: spaceId, id }).catch(() => null)
          : Promise.resolve(),
      ]);

      removeFile(id);
      await loadStorageStats();
    } catch (error) {
      console.error("Failed to delete upload:", error);
    }
  };

  // Add item to canvas on click
  const addItemToCanvas = async (asset: VisualAsset) => {
    try {
      const typeMap: Record<MediaType, string> = { image: "Image", video: "Video", audio: "Audio" };
      await core.clip.add(
        { type: typeMap[asset.type] as any, src: asset.src, name: asset.name },
        { objectFit: "contain" },
      );
    } catch (error) {
      console.error("Failed to add clip:", error);
    }
  };

  // Map Zustand files to VisualAsset interface for rendering compatibility
  const mappedAssets: VisualAsset[] = files.map((f) => ({
    id: f.id,
    type: f.type,
    src: f.src,
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
    <div className="h-full flex flex-col relative">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/*,audio/*"
        multiple
        onChange={handleFileUpload}
      />

      {/* ── Uploads area (scrollable) ── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {files.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 text-muted-foreground">
              <IconPhoto size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1.5">No Assets Yet</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[210px] mb-5">
              Get started by uploading your own files or generating new ones using AI.
            </p>
          </div>
        ) : (
          /* With assets: search + grid */
          <>
            {/* Search and Filter Row */}
            <div className="flex items-center gap-2 w-full px-4 py-3">
              {/* Search Input */}
              <div className="relative flex-1 min-w-0">
                <IconSearch
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  placeholder="Search assets..."
                  className="w-full h-9 pl-9 pr-3 text-[13px] bg-secondary/50 border border-border/60 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border focus:bg-background transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-9 p-0 shrink-0 bg-secondary/50 hover:bg-secondary border-border/60 text-foreground flex items-center justify-center rounded-lg transition-colors"
                  >
                    <IconFilter size={15} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="border-border bg-popover text-popover-foreground rounded-xl w-36"
                >
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
            </div>

            <ScrollArea className="flex-1 px-4">
              {filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <IconPhoto size={28} className="opacity-40" />
                  <span className="text-xs">No matches found.</span>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-3 pb-4">
                  {filteredAssets.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      onAdd={addItemToCanvas}
                      onSelect={(asset) => setSelectedAssetId(asset.id)}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </div>
      {showGenerator && (
        <div className="absolute bottom-4 left-4 right-4 max-w-[600px] mx-auto">
          <AssetGeneratorExpandable
            onUploadClick={() => fileInputRef.current?.click()}
            isUploading={isUploading}
            floating
          />
        </div>
      )}

      {/* Asset Preview & Details Dialog Modal */}
      <Dialog
        open={selectedAssetId !== null}
        onOpenChange={(open) => !open && setSelectedAssetId(null)}
      >
        <DialogContent className="sm:max-w-2xl bg-popover text-popover-foreground rounded-xl border border-border p-0 overflow-hidden shadow-2xl">
          {selectedAsset && (
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] h-[480px]">
              {/* Left Column: Preview */}
              <div className="bg-muted/10 p-6 flex flex-col items-center justify-center border-r border-border min-h-0 relative">
                <div className="w-full flex-1 flex items-center justify-center min-h-0">
                  <div className="border border-border/40 bg-zinc-950 rounded-xl shadow-2xl overflow-hidden aspect-video flex items-center justify-center p-1 w-full max-w-sm">
                    {selectedAsset.type === "image" && (
                      <img
                        src={selectedAsset.src}
                        alt={selectedAsset.name}
                        className="max-h-full max-w-full object-contain rounded-lg"
                      />
                    )}
                    {selectedAsset.type === "video" && (
                      <video
                        src={selectedAsset.src}
                        controls
                        className="max-h-full max-w-full object-contain rounded-lg"
                      />
                    )}
                    {selectedAsset.type === "audio" && (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-zinc-950/80 p-4">
                        <div className="w-16 h-16 rounded-full bg-secondary/80 flex items-center justify-center shadow-inner border border-border/60">
                          <IconMusic size={28} className="text-primary animate-pulse" />
                        </div>
                        <audio src={selectedAsset.src} controls className="w-full px-2" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Details & Status & Actions */}
              <div className="p-6 flex flex-col justify-between min-h-0">
                <div className="space-y-5 overflow-y-auto pr-1">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-semibold tracking-wider font-mono px-2 py-0.5"
                      >
                        {selectedAsset.type}
                      </Badge>
                      {selectedAsset.indexingStatus === "completed" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20 font-semibold font-mono px-2 py-0.5"
                        >
                          Ready
                        </Badge>
                      )}
                      {selectedAsset.indexingStatus === "failed" && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] font-semibold font-mono px-2 py-0.5"
                        >
                          Failed
                        </Badge>
                      )}
                      {(selectedAsset.indexingStatus === "pending" ||
                        selectedAsset.indexingStatus === "processing") && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20 font-semibold animate-pulse font-mono px-2 py-0.5"
                        >
                          {selectedAsset.indexingStatus === "pending" ? "Queued" : "Processing"}
                        </Badge>
                      )}
                    </div>
                    <DialogTitle className="font-heading text-base font-bold leading-snug break-all text-foreground">
                      {selectedAsset.name}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Preview and details for {selectedAsset.name}
                    </DialogDescription>
                  </div>

                  {/* Metadata fields (Shadcn Pills) */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center py-2 px-3 bg-muted/40 border border-border/20 rounded-lg text-xs hover:bg-muted/65 transition-colors">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <IconFile size={13} className="opacity-70 text-foreground" />
                        File Size
                      </span>
                      <span className="text-foreground font-semibold font-mono">
                        {formatBytes(selectedAsset.size)}
                      </span>
                    </div>
                    {selectedAsset.duration && (
                      <div className="flex justify-between items-center py-2 px-3 bg-muted/40 border border-border/20 rounded-lg text-xs hover:bg-muted/65 transition-colors">
                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                          <IconClock size={13} className="opacity-70 text-foreground" />
                          Duration
                        </span>
                        <span className="text-foreground font-semibold font-mono">
                          {formatDuration(selectedAsset.duration)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 px-3 bg-muted/40 border border-border/20 rounded-lg text-xs hover:bg-muted/65 transition-colors">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <IconLink size={13} className="opacity-70 text-foreground" />
                        Source
                      </span>
                      <a
                        href={selectedAsset.src}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-mono text-[11px] truncate max-w-[140px] flex items-center gap-0.5"
                        title={selectedAsset.src}
                      >
                        Open Link
                        <IconLink size={10} className="opacity-60" />
                      </a>
                    </div>
                  </div>

                  {/* Upload/Indexing Status details */}
                  {selectedAsset.indexingStatus !== "completed" && (
                    <div className="bg-secondary/15 rounded-xl p-4 border border-border/40 space-y-3">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        {selectedAsset.indexingStatus === "failed" ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        )}
                        Indexing Pipeline Status
                      </h4>

                      {selectedAsset.indexingStatus === "failed" && (
                        <p className="text-[11px] text-destructive leading-normal font-medium bg-destructive/5 p-2 rounded border border-destructive/10">
                          {selectedAsset.indexingError ||
                            "An error occurred during video indexing pipeline processing."}
                        </p>
                      )}

                      {(selectedAsset.indexingStatus === "pending" ||
                        selectedAsset.indexingStatus === "processing") && (
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center text-[11px] font-semibold">
                            <span className="text-muted-foreground">
                              {selectedAsset.indexingStatus === "pending"
                                ? "Queued for Indexing"
                                : "Running indexing pipeline"}
                            </span>
                            {selectedAsset.indexingProgress !== null &&
                              selectedAsset.indexingProgress !== undefined && (
                                <span className="text-amber-500 font-mono">
                                  {selectedAsset.indexingProgress}%
                                </span>
                              )}
                          </div>

                          {selectedAsset.indexingStage && (
                            <div className="text-[10px] font-medium text-amber-500/90 font-mono bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 inline-block">
                              Stage:{" "}
                              {selectedAsset.indexingStage
                                .replace(/[_-]/g, " ")
                                .replace(/\b\w/g, (c) => c.toUpperCase())}
                            </div>
                          )}

                          {selectedAsset.indexingProgress !== null &&
                          selectedAsset.indexingProgress !== undefined &&
                          selectedAsset.indexingProgress > 0 ? (
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 transition-all duration-300"
                                style={{ width: `${selectedAsset.indexingProgress}%` }}
                              />
                            </div>
                          ) : (
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden relative">
                              <div
                                className="absolute inset-y-0 bg-amber-500/60 animate-pulse w-1/2 rounded-full"
                                style={{ animationDuration: "1.5s" }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col gap-2 pt-4 border-t border-border/60">
                  <Button
                    className="w-full h-10 font-semibold gap-2 shadow-sm"
                    onClick={async () => {
                      await addItemToCanvas(selectedAsset);
                      setSelectedAssetId(null);
                    }}
                  >
                    <IconPlus size={16} strokeWidth={2.5} />
                    Add to Timeline
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-9 font-medium gap-1.5"
                      onClick={() => {
                        triggerIndex
                          .mutateAsync({ id: selectedAsset.id, spaceId: spaceId || "" })
                          .then(() => {
                            updateFile(selectedAsset.id, { indexingStatus: "pending" });
                          })
                          .catch((err) => {
                            console.error("Failed to re-index:", err);
                          });
                      }}
                      disabled={
                        selectedAsset.indexingStatus === "pending" ||
                        selectedAsset.indexingStatus === "processing"
                      }
                    >
                      <IconRefresh
                        size={14}
                        className={
                          selectedAsset.indexingStatus === "processing" ? "animate-spin" : ""
                        }
                      />
                      Re-index
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 text-xs h-9 font-medium gap-1.5"
                      onClick={async () => {
                        await handleDelete(selectedAsset.id);
                        setSelectedAssetId(null);
                      }}
                    >
                      <IconTrash size={14} />
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
