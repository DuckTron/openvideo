"""HTTP API server for the OpenVideo video renderer.

Exposes a POST /render endpoint that accepts a project JSON,
renders the video, uploads to R2, and returns the public URL.

Works on any platform: Docker locally, Cloud Run, Fly.io, Railway, etc.

Usage:
    python3 -u /app/src/api/server.py
    Listens on PORT env var (default 8080).
"""

import asyncio
import json
import os
import sys
import uuid
import time

sys.path.insert(0, os.path.dirname(__file__))

from http.server import HTTPServer, BaseHTTPRequestHandler
from renderer import render_video


def _generate_r2_key() -> str:
    """Auto-generate a unique R2 object key for the rendered video."""
    timestamp = int(time.time())
    unique_id = uuid.uuid4().hex[:8]
    return f"renders/{timestamp}-{unique_id}.mp4"


class RenderHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/render":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            payload = json.loads(body)

            project = payload
            if "settings" not in project or "tracks" not in project:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid project JSON. Must contain 'settings' and 'tracks'."}).encode())
                return

            r2_key = _generate_r2_key()
            options = {"r2_key": r2_key}

            try:
                result = asyncio.run(render_video(project, options))

                if isinstance(result, dict):
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode())
                else:
                    # Fallback if R2 is not configured — return raw bytes
                    self.send_response(200)
                    self.send_header("Content-Type", "video/mp4")
                    self.send_header("Content-Length", str(len(result)))
                    self.end_headers()
                    self.wfile.write(result)
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy"}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path == "/health" or self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy", "service": "openvideo-renderer"}).encode())
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    server = HTTPServer(("0.0.0.0", port), RenderHandler)
    print(f"[server] Listening on port {port}...")
    server.serve_forever()
