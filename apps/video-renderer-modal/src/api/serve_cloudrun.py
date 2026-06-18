"""Cloud Run HTTP server wrapper for the video renderer.

Exposes a POST /render endpoint that accepts project JSON and options,
renders the video, and returns the R2 URL or raw bytes.

Usage (Cloud Run):
    Entrypoint: python3 -u /app/src/api/serve_cloudrun.py
    Port: 8080 (default Cloud Run port)
"""

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from http.server import HTTPServer, BaseHTTPRequestHandler
from renderer import render_video


class RenderHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/render":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            payload = json.loads(body)

            project = payload.get("project")
            options = payload.get("options", {})

            if not project:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "missing 'project' field"}).encode())
                return

            try:
                result = asyncio.run(render_video(project, options))

                if isinstance(result, dict):
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode())
                else:
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
    print(f"[cloudrun] Listening on port {port}...")
    server.serve_forever()
