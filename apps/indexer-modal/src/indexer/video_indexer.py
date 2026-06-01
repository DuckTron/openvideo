"""Main video indexer orchestrator following SOLID principles."""

import os
import tempfile
import asyncio
from typing import List, Optional
import cv2
import numpy as np
from PIL import Image
import io

from ..core.interfaces import (
    VideoDownloader, SceneDetector, AudioTranscriber, 
    VisionAnalyzer, VectorStore, ProgressTracker, 
    DatabaseClient, Asset, Scene, VisualScene, 
    TranscriptSegment, IndexingProgress, IndexingStatus
)
from ..core.exceptions import VideoIndexingError
from ..services.downloader import HttpVideoDownloader
from ..services.scene_detector import FFmpegSceneDetector
from ..services.transcriber import DeepgramTranscriber
from ..services.vision_analyzer import GeminiVisionAnalyzer
from ..services.vector_store import PGVectorStore
from ..services.progress_tracker import DatabaseProgressTracker
from ..services.database import PostgreSQLClient
from ..shared.logging import get_logger, setup_logging

# Initialize logging
setup_logging()
logger = get_logger("video_indexer")


class VideoIndexer:
    """Main orchestrator for video indexing pipeline."""
    
    def __init__(
        self,
        downloader: Optional[VideoDownloader] = None,
        scene_detector: Optional[SceneDetector] = None,
        transcriber: Optional[AudioTranscriber] = None,
        vision_analyzer: Optional[VisionAnalyzer] = None,
        vector_store: Optional[VectorStore] = None,
        progress_tracker: Optional[ProgressTracker] = None,
        database: Optional[DatabaseClient] = None
    ):
        """Initialize with dependency injection."""
        self.downloader = downloader or HttpVideoDownloader()
        self.scene_detector = scene_detector or FFmpegSceneDetector()
        self.transcriber = transcriber or DeepgramTranscriber()
        self.vision_analyzer = vision_analyzer or GeminiVisionAnalyzer()
        self.vector_store = vector_store or PGVectorStore()
        self.progress_tracker = progress_tracker or DatabaseProgressTracker()
        self.database = database or PostgreSQLClient()
    
    async def index_asset(self, asset_id: str) -> None:
        """Main entry point for indexing an asset."""
        logger.info(f"Starting indexing for asset: {asset_id}")
        
        try:
            # Get asset information
            asset = await self.database.get_asset(asset_id)
            if not asset:
                raise VideoIndexingError(f"Asset {asset_id} not found")
            
            logger.info(f"Found asset: {asset.name} (type: {asset.type})")
            
            # Initialize progress tracking - mark as started
            await self._update_progress(asset.id, 0, "starting")
            
            # Clean up existing vectors
            logger.debug(f"Cleaning up existing vectors for asset: {asset_id}")
            await self.vector_store.delete_by_asset(asset_id)
            
            # Route to appropriate processor
            if asset.type == "video":
                logger.info(f"Processing video asset: {asset.name}")
                await self._index_video(asset)
            elif asset.type == "audio":
                logger.info(f"Processing audio asset: {asset.name}")
                await self._index_audio(asset)
            elif asset.type == "image":
                logger.info(f"Processing image asset: {asset.name}")
                await self._index_image(asset)
            else:
                raise VideoIndexingError(f"Unsupported asset type: {asset.type}")
            
            # Mark as completed
            await self._update_progress(asset.id, 100, "completed")
            logger.info(f"Successfully completed indexing for asset: {asset_id}")
            
        except Exception as e:
            logger.error(f"Indexing failed for {asset_id}: {str(e)}", exc_info=True)
            await self._update_progress(asset.id, 0, f"failed: {str(e)}")
            raise VideoIndexingError(f"Indexing failed for {asset_id}: {str(e)}")
    
    async def _index_video(self, asset: Asset) -> None:
        """Index video asset with scene detection and transcription."""
        temp_video_path = None
        temp_frame_dir = None
        
        try:
            # Download video
            await self._update_progress(asset.id, 5, "downloading")
            temp_video_path = await self.downloader.download(asset)
            
            # Detect scenes
            await self._update_progress(asset.id, 15, "detecting_scenes")
            scenes = await self.scene_detector.detect_scenes(
                temp_video_path,
                threshold=0.3,
                min_scene_duration=2.0,
                max_scene_duration=300.0,
                max_scenes=50
            )
            
            # Run transcription first (needed for temporal chunking)
            await self._update_progress(asset.id, 25, "transcribing")
            segments = await self.transcriber.transcribe(asset.src)
            await self.database.save_transcript(asset.id, segments)
            
            # Dense 1fps indexing with transcript-aware temporal chunks
            await self._update_progress(asset.id, 35, "dense_indexing")
            await self._index_video_dense(asset, temp_video_path, segments)
            
            await self._update_progress(asset.id, 100, "completed")
            
        finally:
            # Cleanup temp files
            if temp_video_path and os.path.exists(temp_video_path):
                os.unlink(temp_video_path)
            if temp_frame_dir and os.path.exists(temp_frame_dir):
                import shutil
                shutil.rmtree(temp_frame_dir)
    
    async def _index_audio(self, asset: Asset) -> None:
        """Index audio asset with transcription."""
        try:
            await self._update_progress(asset.id, 25, "transcribing")
            
            # Transcribe audio
            segments = await self.transcriber.transcribe(asset.src)
            
            # Save transcript
            await self.database.save_transcript(asset.id, segments)
            
            # Create vector documents
            await self._create_audio_vectors(asset, segments)
            
            await self._update_progress(asset.id, 100, "completed")
            
        except Exception as e:
            raise VideoIndexingError(f"Audio indexing failed: {str(e)}")
    
    async def _index_image(self, asset: Asset) -> None:
        """Index image asset with visual analysis."""
        try:
            await self._update_progress(asset.id, 25, "analyzing")
            
            # Download and analyze image
            temp_path = await self.downloader.download(asset)
            
            with open(temp_path, "rb") as f:
                image_data = f.read()
            
            description = await self.vision_analyzer.analyze_image(
                image_data, 
                "Describe this image in detail. Include: visible objects and people, any text shown on screen, colors and visual style, overall scene setting and context, and likely topics or themes."
            )
            
            # Create vector document
            await self._create_image_vectors(asset, description)
            
            await self._update_progress(asset.id, 100, "completed")
            
            # Cleanup
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
        except Exception as e:
            raise VideoIndexingError(f"Image indexing failed: {str(e)}")
    
    async def _transcribe_and_save(self, asset: Asset) -> List[TranscriptSegment]:
        """Transcribe audio and save to database."""
        try:
            segments = await self.transcriber.transcribe(asset.src)
            await self.database.save_transcript(asset.id, segments)
            return segments
        except Exception as e:
            print(f"Transcription failed for {asset.name}: {e}")
            return []
    
    async def _analyze_visual_scenes(
        self, 
        asset: Asset, 
        video_path: str, 
        scenes: List[Scene]
    ) -> List[VisualScene]:
        """Analyze visual scenes with frame extraction."""
        if not scenes:
            return []
        
        temp_frame_dir = tempfile.mkdtemp(prefix="frames_")
        visual_scenes = []
        
        try:
            # Process scenes in batches
            BATCH_SIZE = 3
            for i in range(0, len(scenes), BATCH_SIZE):
                batch = scenes[i:i + BATCH_SIZE]
                batch_results = await asyncio.gather(
                    *[
                        self._process_single_scene(asset, video_path, temp_frame_dir, scene)
                        for scene in batch
                    ],
                    return_exceptions=True
                )
                
                for result in batch_results:
                    if isinstance(result, Exception):
                        print(f"Scene processing failed: {result}")
                    else:
                        visual_scenes.append(result)
                
                # Update progress
                progress = 30 + int((i / len(scenes)) * 50)
                await self._update_progress(asset.id, progress, "analyzing_scenes")
            
            # Save visual timeline
            if visual_scenes:
                await self.database.save_visual_timeline(asset.id, visual_scenes)
            
            return visual_scenes
            
        finally:
            import shutil
            if os.path.exists(temp_frame_dir):
                shutil.rmtree(temp_frame_dir)
    
    async def _process_single_scene(
        self, 
        asset: Asset, 
        video_path: str, 
        frame_dir: str, 
        scene: Scene
    ) -> VisualScene:
        """Process a single scene: extract frames and analyze."""
        try:
            # Extract 3 keyframes from scene
            frames = self._extract_keyframes(video_path, scene, frame_dir)
            
            if not frames:
                return VisualScene(
                    start_ms=int(scene.start_time * 1000),
                    end_ms=int(scene.end_time * 1000),
                    description="No visual content detected",
                    objects=[],
                    topics=[],
                    keywords=[]
                )
            
            # Analyze frames
            analysis = await self.vision_analyzer.analyze_scene_frames(
                frames,
                "Analyze these frames from a video scene."
            )
            
            return VisualScene(
                start_ms=int(scene.start_time * 1000),
                end_ms=int(scene.end_time * 1000),
                description=analysis.get("description", ""),
                objects=analysis.get("objects", []),
                topics=analysis.get("topics", []),
                keywords=analysis.get("keywords", [])
            )
            
        except Exception as e:
            print(f"Scene analysis failed: {e}")
            return VisualScene(
                start_ms=int(scene.start_time * 1000),
                end_ms=int(scene.end_time * 1000),
                description=f"Scene analysis failed: {str(e)}",
                objects=[],
                topics=[],
                keywords=[]
            )
    
    def _extract_keyframes(
        self, 
        video_path: str, 
        scene: Scene, 
        frame_dir: str
    ) -> List[bytes]:
        """Extract keyframes from a scene at regular intervals for action detection."""
        try:
            cap = cv2.VideoCapture(video_path)
            frames = []
            
            # Get scene duration
            duration = scene.end_time - scene.start_time
            
            # For short scenes (< 3s), extract 4 frames distributed throughout
            # For longer scenes, extract frames every ~1 second, up to 8 frames
            if duration < 3.0:
                positions = [
                    scene.start_time,
                    scene.start_time + duration * 0.25,
                    scene.start_time + duration * 0.5,
                    scene.start_time + duration * 0.75,
                ]
            else:
                # Extract frames every ~1 second
                interval = max(0.8, duration / 8.0)
                positions = []
                current = scene.start_time
                while current < scene.end_time - 0.2 and len(positions) < 8:
                    positions.append(current)
                    current += interval
            
            for pos in positions:
                cap.set(cv2.CAP_PROP_POS_MSEC, pos * 1000)
                ret, frame = cap.read()
                
                if ret:
                    # Convert to RGB and resize
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    frame_resized = cv2.resize(frame_rgb, (640, 480))
                    
                    # Convert to PIL Image and then to bytes
                    pil_image = Image.fromarray(frame_resized)
                    img_bytes = io.BytesIO()
                    pil_image.save(img_bytes, format='JPEG')
                    frames.append(img_bytes.getvalue())
            
            cap.release()
            return frames
            
        except Exception as e:
            print(f"Frame extraction failed: {e}")
            return []
    
    async def _create_video_vectors(
        self, 
        asset: Asset, 
        segments: List[TranscriptSegment], 
        visual_scenes: List[VisualScene]
    ) -> None:
        """Create vector documents for video content."""
        from langchain_core.documents import Document
        
        documents = []
        
        # Visual documents
        for scene in visual_scenes:
            topics_str = ", ".join(scene.topics) if scene.topics else ""
            objects_str = ", ".join(scene.objects) if scene.objects else ""
            keywords_str = ", ".join(scene.keywords) if scene.keywords else ""
            
            content_parts = [
                f"title: {asset.name}",
                f"description: {scene.description}"
            ]
            
            if topics_str:
                content_parts.append(f"topics: {topics_str}")
            if objects_str:
                content_parts.append(f"objects: {objects_str}")
            if keywords_str:
                content_parts.append(f"keywords: {keywords_str}")
            
            documents.append(Document(
                page_content=" | ".join(content_parts),
                metadata={
                    "spaceId": asset.space_id,
                    "assetId": asset.id,
                    "assetName": asset.name,
                    "assetType": "video",
                    "src": asset.src,
                    "layer": "asset-visual-description",
                    "startMs": scene.start_ms,
                    "endMs": scene.end_ms,
                    "topics": scene.topics,
                    "objects": scene.objects
                }
            ))
        
        # Audio documents
        for segment in segments:
            documents.append(Document(
                page_content=f"title: {asset.name} | text: {segment.text}",
                metadata={
                    "spaceId": asset.space_id,
                    "assetId": asset.id,
                    "assetName": asset.name,
                    "assetType": "video",
                    "src": asset.src,
                    "layer": "asset-transcript",
                    "startMs": segment.start_ms,
                    "endMs": segment.end_ms
                }
            ))
        
        if documents:
            await self.vector_store.upsert_documents(documents)
    
    async def _create_audio_vectors(self, asset: Asset, segments: List[TranscriptSegment]) -> None:
        """Create vector documents for audio content."""
        from langchain_core.documents import Document
        
        documents = []
        
        for segment in segments:
            documents.append(Document(
                page_content=f"title: {asset.name} | text: {segment.text}",
                metadata={
                    "spaceId": asset.space_id,
                    "assetId": asset.id,
                    "assetName": asset.name,
                    "assetType": "audio",
                    "src": asset.src,
                    "layer": "asset-transcript",
                    "startMs": segment.start_ms,
                    "endMs": segment.end_ms
                }
            ))
        
        if documents:
            await self.vector_store.upsert_documents(documents)
    
    async def _create_image_vectors(self, asset: Asset, description: str) -> None:
        """Create vector documents for image content."""
        from langchain_core.documents import Document
        
        document = Document(
            page_content=f"title: {asset.name} | description: {description}",
            metadata={
                "spaceId": asset.space_id,
                "assetId": asset.id,
                "assetName": asset.name,
                "assetType": "image",
                "src": asset.src,
                "layer": "asset-description"
            }
        )
        
        await self.vector_store.upsert_documents([document])
    
    async def _index_video_dense(
        self,
        asset: Asset,
        video_path: str,
        segments: List[TranscriptSegment]
    ) -> None:
        """Dense 1fps indexing with transcript-aware temporal chunks.
        
        Best practice for AI video editors:
        - Sample frames every 1 second for granular search
        - Create temporal chunks aligned with transcript segments
        - Combine visual + audio in multi-modal embeddings
        """
        from langchain_core.documents import Document
        
        logger.info(f"Starting dense 1fps indexing for {asset.name}")
        
        # Get video duration
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = total_frames / fps if fps > 0 else 0
        cap.release()
        
        logger.info(f"Video duration: {duration_sec:.1f}s, FPS: {fps}")
        
        # Create temporal chunks aligned with transcript segments
        # If no transcript, use 5-second sliding windows
        chunks = []
        
        if segments:
            # Use transcript segments to define chunk boundaries
            for seg in segments:
                chunks.append({
                    "start_ms": seg.start_ms,
                    "end_ms": seg.end_ms,
                    "text": seg.text,
                    "type": "transcript_chunk"
                })
        else:
            # No transcript - use 5-second sliding windows with 2s overlap
            window_size = 5000  # 5 seconds
            overlap = 2000  # 2 seconds
            current = 0
            while current < duration_sec * 1000:
                chunks.append({
                    "start_ms": current,
                    "end_ms": min(current + window_size, int(duration_sec * 1000)),
                    "text": "",
                    "type": "visual_chunk"
                })
                current += (window_size - overlap)
        
        logger.info(f"Created {len(chunks)} temporal chunks")
        
        # Process each chunk: extract frames + analyze + create embedding
        documents = []
        
        for i, chunk in enumerate(chunks):
            start_sec = chunk["start_ms"] / 1000
            end_sec = chunk["end_ms"] / 1000
            chunk_duration = end_sec - start_sec
            
            # Extract 3-4 frames spread across the chunk
            frame_positions = [
                start_sec,
                start_sec + chunk_duration * 0.33,
                start_sec + chunk_duration * 0.67,
                end_sec - 0.1
            ]
            
            # Extract and analyze frames
            frames = self._extract_frames_at_positions(video_path, frame_positions)
            
            if frames:
                # Analyze frames with Gemini
                context = f"""Video segment from {start_sec:.1f}s to {end_sec:.1f}s.
Transcript: "{chunk['text']}""" if chunk['text'] else f"Video segment from {start_sec:.1f}s to {end_sec:.1f}s."
                
                analysis = await self.vision_analyzer.analyze_scene_frames(frames, context)
                
                # Create rich multi-modal content combining visual + transcript
                visual_desc = analysis.get("description", "")
                objects = ", ".join(analysis.get("objects", []))
                topics = ", ".join(analysis.get("topics", []))
                
                # Combine transcript + visual for semantic search
                if chunk['text']:
                    page_content = f"""title: {asset.name}
time: {start_sec:.1f}s - {end_sec:.1f}s
transcript: {chunk['text']}
visual: {visual_desc}
objects: {objects}
topics: {topics}"""
                else:
                    page_content = f"""title: {asset.name}
time: {start_sec:.1f}s - {end_sec:.1f}s
visual: {visual_desc}
objects: {objects}
topics: {topics}"""
                
                doc = Document(
                    page_content=page_content,
                    metadata={
                        "spaceId": asset.space_id,
                        "assetId": asset.id,
                        "assetName": asset.name,
                        "assetType": "video",
                        "src": asset.src,
                        "layer": "video-chunk",
                        "startMs": chunk["start_ms"],
                        "endMs": chunk["end_ms"],
                        "transcriptText": chunk.get("text", ""),
                        "visualDescription": visual_desc,
                        "objects": analysis.get("objects", []),
                        "topics": analysis.get("topics", []),
                        "keywords": analysis.get("keywords", [])
                    }
                )
                documents.append(doc)
            
            # Progress update every 5 chunks
            if (i + 1) % 5 == 0:
                progress = 35 + int((i + 1) / len(chunks) * 50)
                await self._update_progress(asset.id, min(progress, 85), "analyzing")
        
        # Store all documents
        if documents:
            logger.info(f"Upserting {len(documents)} dense video chunks")
            await self.vector_store.upsert_documents(documents)
            
            # Also save visual timeline
            visual_scenes = [
                {
                    "startMs": d.metadata["startMs"],
                    "endMs": d.metadata["endMs"],
                    "description": d.metadata["visualDescription"],
                    "objects": d.metadata["objects"],
                    "topics": d.metadata["topics"],
                    "keywords": d.metadata["keywords"]
                }
                for d in documents
            ]
            await self.database.save_visual_timeline(asset.id, visual_scenes)
    
    def _extract_frames_at_positions(self, video_path: str, positions: List[float]) -> List[bytes]:
        """Extract frames at specific time positions."""
        frames = []
        cap = cv2.VideoCapture(video_path)
        
        for pos in positions:
            cap.set(cv2.CAP_PROP_POS_MSEC, pos * 1000)
            ret, frame = cap.read()
            if ret:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_resized = cv2.resize(frame_rgb, (640, 480))
                pil_image = Image.fromarray(frame_resized)
                img_bytes = io.BytesIO()
                pil_image.save(img_bytes, format='JPEG')
                frames.append(img_bytes.getvalue())
        
        cap.release()
        return frames
    
    async def _update_progress(self, asset_id: str, progress: int, stage: str) -> None:
        """Update progress tracking."""
        try:
            # Direct database update for reliability
            import psycopg2
            from datetime import datetime
            
            # Determine status based on progress/stage
            status = "processing"
            if progress == 100 and stage == "completed":
                status = "completed"
            elif stage.startswith("failed"):
                status = "failed"
            elif progress == 0 and stage == "starting":
                status = "processing"
            
            conn = psycopg2.connect(os.getenv("DATABASE_URL"))
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE asset_indexing_status
                        SET progress = %s, stage = %s, status = %s, updated_at = %s
                        WHERE asset_id = %s
                        """,
                        (progress, stage, status, datetime.utcnow(), asset_id)
                    )
                    conn.commit()
                    logger.info(f"Updated progress for {asset_id}: {progress}% ({stage}) [{status}]")
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Progress update failed for {asset_id}: {e}")
