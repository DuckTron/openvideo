"""Database client implementation."""

import os
from typing import Optional, List, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from nanoid import generate
from dotenv import load_dotenv

from ..core.interfaces import DatabaseClient, Asset, TranscriptSegment, VisualScene
from ..core.exceptions import DatabaseError

load_dotenv()


class PostgreSQLClient(DatabaseClient):
    """PostgreSQL database client."""
    
    def __init__(self, connection_string: Optional[str] = None):
        self.connection_string = (
            connection_string or 
            os.getenv("DATABASE_URL")
        )
        if not self.connection_string:
            raise DatabaseError("DATABASE_URL not configured")
    
    async def get_asset(self, asset_id: str) -> Optional[Asset]:
        """Retrieve asset by ID."""
        try:
            conn = psycopg2.connect(self.connection_string)
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(
                        """
                        SELECT id, name, type, src, space_id, user_id, duration, size, width, height
                        FROM asset
                        WHERE id = %s
                        """,
                        (asset_id,)
                    )
                    
                    row = cursor.fetchone()
                    if not row:
                        return None
                    
                    return Asset(
                        id=row["id"],
                        name=row["name"],
                        type=row["type"],
                        src=row["src"],
                        space_id=row["space_id"],
                        user_id=row["user_id"],
                        duration=row["duration"],
                        size=row["size"],
                        dimensions={"width": row["width"], "height": row["height"]}
                    )
                    
            finally:
                conn.close()
                
        except Exception as e:
            raise DatabaseError(f"Failed to get asset {asset_id}: {str(e)}")
    
    async def save_transcript(self, asset_id: str, segments: List[TranscriptSegment]) -> None:
        """Save transcript segments."""
        try:
            conn = psycopg2.connect(self.connection_string)
            try:
                with conn.cursor() as cursor:
                    # Convert segments to JSON
                    segments_json = [
                        {
                            "text": seg.text,
                            "startMs": seg.start_ms,
                            "endMs": seg.end_ms,
                            "words": seg.words
                        }
                        for seg in segments
                    ]
                    
                    # Get space_id from asset
                    cursor.execute(
                        "SELECT space_id FROM asset WHERE id = %s",
                        (asset_id,)
                    )
                    space_row = cursor.fetchone()
                    if not space_row:
                        raise DatabaseError(f"Asset {asset_id} not found")
                    
                    space_id = space_row[0]
                    
                    # Upsert transcript
                    cursor.execute(
                        """
                        INSERT INTO asset_transcript 
                        (id, asset_id, space_id, segments)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (asset_id) 
                        DO UPDATE SET
                            segments = EXCLUDED.segments
                        """,
                        (
                            generate(),
                            asset_id,
                            space_id,
                            segments_json
                        )
                    )
                    conn.commit()
                    
            finally:
                conn.close()
                
        except Exception as e:
            raise DatabaseError(f"Failed to save transcript for {asset_id}: {str(e)}")
    
    async def save_visual_timeline(self, asset_id: str, scenes: List[VisualScene]) -> None:
        """Save visual timeline data."""
        try:
            conn = psycopg2.connect(self.connection_string)
            try:
                with conn.cursor() as cursor:
                    # Convert scenes to JSON
                    scenes_json = [
                        {
                            "startMs": scene.start_ms,
                            "endMs": scene.end_ms,
                            "description": scene.description,
                            "objects": scene.objects,
                            "topics": scene.topics,
                            "keywords": scene.keywords
                        }
                        for scene in scenes
                    ]
                    
                    # Get space_id from asset
                    cursor.execute(
                        "SELECT space_id FROM asset WHERE id = %s",
                        (asset_id,)
                    )
                    space_row = cursor.fetchone()
                    if not space_row:
                        raise DatabaseError(f"Asset {asset_id} not found")
                    
                    space_id = space_row[0]
                    
                    # Upsert visual timeline
                    cursor.execute(
                        """
                        INSERT INTO asset_visual_timeline 
                        (id, asset_id, space_id, scenes)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (asset_id) 
                        DO UPDATE SET
                            scenes = EXCLUDED.scenes
                        """,
                        (
                            generate(),
                            asset_id,
                            space_id,
                            scenes_json
                        )
                    )
                    conn.commit()
                    
            finally:
                conn.close()
                
        except Exception as e:
            raise DatabaseError(f"Failed to save visual timeline for {asset_id}: {str(e)}")
    
    async def create_indexing_status(self, asset_id: str, space_id: str) -> None:
        """Create initial indexing status."""
        try:
            conn = psycopg2.connect(self.connection_string)
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO asset_indexing_status 
                        (id, asset_id, space_id, status, progress, stage, error, updated_at, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (asset_id) DO NOTHING
                        """,
                        (
                            f"status_{asset_id}",
                            asset_id,
                            space_id,
                            "pending",
                            0,
                            "pending",
                            None,
                            datetime.utcnow(),
                            datetime.utcnow()
                        )
                    )
                    conn.commit()
                    
            finally:
                conn.close()
                
        except Exception as e:
            raise DatabaseError(f"Failed to create indexing status for {asset_id}: {str(e)}")
