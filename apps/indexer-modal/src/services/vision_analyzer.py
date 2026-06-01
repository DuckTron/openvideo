"""Vision analysis implementation using Gemini AI."""

import os
import base64
import json
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from dotenv import load_dotenv

from ..core.interfaces import VisionAnalyzer, VisualScene
from ..core.exceptions import VisionAnalysisError

load_dotenv()


class GeminiVisionAnalyzer(VisionAnalyzer):
    """Vision analyzer using Google's Gemini AI."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.5-flash"):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise VisionAnalysisError("GOOGLE_API_KEY not configured")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(model)
    
    async def analyze_image(self, image_data: bytes, context: str) -> str:
        """Analyze a single image."""
        try:
            # Prepare content
            content = [
                {
                    "inline_data": {
                        "mime_type": self._detect_mime_type(image_data),
                        "data": base64.b64encode(image_data).decode()
                    }
                },
                context
            ]
            
            response = await self.model.generate_content_async(content)
            return response.text or "No description generated."
            
        except Exception as e:
            raise VisionAnalysisError(f"Image analysis failed: {str(e)}")
    
    async def analyze_scene_frames(
        self, 
        frames: List[bytes], 
        context: str
    ) -> Dict[str, Any]:
        """Analyze multiple frames from a scene."""
        try:
            # Prepare prompt for structured analysis
            prompt = f"""{context}

Analyze these {len(frames)} frames from a video scene.

Describe:
1. What is happening visually - actions, setting, composition, lighting, mood
2. Key objects, people, or entities visible
3. High-level topics or themes
4. Any text visible on screen
5. Important keywords that describe this scene

Return a JSON object:
{{
  "description": "detailed visual description",
  "objects": ["object1", "object2"],
  "topics": ["topic1", "topic2"],
  "keywords": ["keyword1", "keyword2"]
}}

Return raw JSON only. No markdown, no backticks."""
            
            # Prepare content with all frames
            content = []
            for frame in frames:
                content.append({
                    "inline_data": {
                        "mime_type": self._detect_mime_type(frame),
                        "data": base64.b64encode(frame).decode()
                    }
                })
            content.append(prompt)
            
            response = await self.model.generate_content_async(content)
            raw_text = response.text or ""
            
            # Parse JSON response
            try:
                clean_json = raw_text.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(clean_json)
                
                return {
                    "description": parsed.get("description", "No description"),
                    "objects": parsed.get("objects", []),
                    "topics": parsed.get("topics", []),
                    "keywords": parsed.get("keywords", [])
                }
                
            except json.JSONDecodeError:
                # Fallback for non-JSON responses
                return {
                    "description": raw_text[:500] if raw_text else "Analysis failed",
                    "objects": [],
                    "topics": [],
                    "keywords": []
                }
                
        except Exception as e:
            raise VisionAnalysisError(f"Scene analysis failed: {str(e)}")
    
    def _detect_mime_type(self, image_data: bytes) -> str:
        """Detect MIME type from image bytes."""
        # Simple detection based on file signatures
        if image_data.startswith(b'\xFF\xD8\xFF'):
            return "image/jpeg"
        elif image_data.startswith(b'\x89PNG\r\n\x1a\n'):
            return "image/png"
        elif image_data.startswith(b'GIF87a') or image_data.startswith(b'GIF89a'):
            return "image/gif"
        elif image_data.startswith(b'RIFF') and b'WEBP' in image_data[:12]:
            return "image/webp"
        else:
            return "image/jpeg"  # Default fallback
