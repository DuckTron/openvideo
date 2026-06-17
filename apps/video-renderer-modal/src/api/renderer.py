"""Core video rendering engine using Playwright and @openvideo/engine-pixi.

This module contains all rendering logic with ZERO Modal dependencies.
It is shared by both:
  - render_local.py  (Docker / local CLI)
  - modal_app.py     (Modal.com serverless deployment)
"""

import os
import sys
import time
import json
import base64
import http.server
import socketserver
import threading
import tempfile
import urllib.request
import subprocess
import shutil
import ssl
import hashlib
import concurrent.futures
from contextlib import contextmanager
from typing import Dict, Any, Optional, Union

from playwright.async_api import async_playwright

# Optional R2 Upload Dependencies
try:
    import boto3
    from botocore.config import Config
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False


# ---------------------------------------------------------------------------
# Path configuration
# ---------------------------------------------------------------------------

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
RENDERER_HTML_PATH = "/app/renderer.html"
ENGINE_DIST_PATH = "/app/node_modules/@openvideo/engine-pixi/dist"

IS_CONTAINER = os.path.exists(RENDERER_HTML_PATH)

# Local/development path overrides
if not IS_CONTAINER:
    local_html = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "renderer.html"))
    if os.path.exists(local_html):
        RENDERER_HTML_PATH = local_html

    local_dist = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "..", "..", "packages", "engine-pixi", "dist"))
    if os.path.exists(local_dist):
        ENGINE_DIST_PATH = local_dist
    else:
        local_node_modules_dist = os.path.abspath(
            os.path.join(CURRENT_DIR, "..", "..", "node_modules", "@openvideo", "engine-pixi", "dist")
        )
        if os.path.exists(local_node_modules_dist):
            ENGINE_DIST_PATH = local_node_modules_dist


# ---------------------------------------------------------------------------
# Threaded HTTP Server to serve renderer.html and engine-pixi bundle
# ---------------------------------------------------------------------------

class _CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Serves renderer.html and engine-pixi dist files."""

    def __init__(self, *args, **kwargs):
        directory = os.path.dirname(RENDERER_HTML_PATH)
        super().__init__(*args, directory=directory, **kwargs)

    def translate_path(self, path: str) -> str:
        if path.startswith("/engine-pixi/"):
            rel_path = path[len("/engine-pixi/"):]
            rel_path = os.path.normpath(rel_path).lstrip("/")
            return os.path.join(ENGINE_DIST_PATH, rel_path)
        elif path.startswith("/temp-clips/"):
            rel_path = path[len("/temp-clips/"):]
            rel_path = os.path.normpath(rel_path).lstrip("/")
            temp_dir = getattr(self.server, "temp_dir", None)
            if temp_dir:
                return os.path.join(temp_dir, rel_path)
        elif path == "/" or path == "/index.html":
            return RENDERER_HTML_PATH
        return super().translate_path(path)

    def log_message(self, format, *args):
        pass


class _ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    pass


# ---------------------------------------------------------------------------
# Resource Management Context Managers
# ---------------------------------------------------------------------------

@contextmanager
def temporary_dir_context():
    """Create and automatically clean up a temporary directory."""
    temp_dir = tempfile.mkdtemp()
    try:
        yield temp_dir
    finally:
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                print("[renderer] Temporary directory cleaned up.")
            except Exception as e:
                print(f"[renderer] Warning: Failed to clean up temp dir: {e}")


@contextmanager
def xvfb_display_context():
    """Run headed Chromium inside Xvfb on headless Linux environments.
    
    WebCodecs requires full Chromium (not headless shell), so in containers
    we MUST use Xvfb to provide a virtual display for headed mode.
    """
    xvfb_process = None
    if IS_CONTAINER and sys.platform.startswith("linux"):
        print("[renderer] Starting Xvfb virtual display (required for WebCodecs)...")
        xvfb_process = subprocess.Popen(
            ["Xvfb", ":99", "-ac", "-screen", "0", "1920x1080x24", "-nolisten", "tcp"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        os.environ["DISPLAY"] = ":99"
        time.sleep(1)
        # Verify Xvfb started
        if xvfb_process.poll() is not None:
            raise RuntimeError("Xvfb failed to start. Install xvfb: apt-get install -y xvfb")
        print("[renderer] Xvfb running on :99")

    try:
        yield xvfb_process
    finally:
        if xvfb_process:
            print("[renderer] Stopping Xvfb...")
            xvfb_process.terminate()
            xvfb_process.wait()


@contextmanager
def http_server_context(temp_dir: str):
    """Run a threaded HTTP server on a random free port."""
    print("[renderer] Starting HTTP server...")
    server = _ThreadedHTTPServer(("127.0.0.1", 0), _CustomHTTPRequestHandler)
    server.temp_dir = temp_dir
    _, port = server.server_address

    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True
    server_thread.start()
    print(f"[renderer] HTTP server on http://127.0.0.1:{port}")

    try:
        yield port
    finally:
        server.shutdown()
        server.server_close()
        print("[renderer] HTTP server stopped.")


# ---------------------------------------------------------------------------
# Video Pre-transcoding (Opus audio for WebCodecs compatibility)
# ---------------------------------------------------------------------------

def pretranscode_videos(project: dict, temp_dir: str, port: int) -> dict:
    """Pre-transcodes external video clips to MP4 with Opus audio for WebCodecs."""
    clips = project.get("clips", {})
    if not clips:
        return project

    ssl_context = ssl._create_unverified_context()
    transcoded_clips = {}
    cache_dir = os.path.join(tempfile.gettempdir(), "openvideo_transcode_cache")

    def process_clip(clip_id, clip):
        if (
            isinstance(clip, dict)
            and clip.get("type") == "Video"
            and clip.get("src", "").startswith("http")
            and clip.get("audio") != False
        ):
            try:
                src_url = clip["src"]
                url_hash = hashlib.sha256(src_url.encode("utf-8")).hexdigest()
                cached_file = os.path.join(cache_dir, f"transcoded-{url_hash}.mp4")
                temp_output = os.path.join(temp_dir, f"clip-{clip_id}.mp4")

                if os.path.exists(cached_file):
                    print(f"[pretranscode] Cache hit for clip {clip_id}")
                    shutil.copy(cached_file, temp_output)
                else:
                    temp_input = os.path.join(temp_dir, f"input-{clip_id}.mp4")
                    print(f"[pretranscode] Downloading clip {clip_id} from {src_url}...")

                    req = urllib.request.Request(src_url, headers={"User-Agent": "OpenVideo/1.0"})
                    with urllib.request.urlopen(req, context=ssl_context) as response:
                        with open(temp_input, "wb") as out_file:
                            out_file.write(response.read())

                    print(f"[pretranscode] Transcoding clip {clip_id} to MP4/Opus...")
                    subprocess.run(
                        ["ffmpeg", "-i", temp_input, "-c:v", "copy", "-c:a", "libopus", "-b:a", "128k", temp_output, "-y"],
                        check=True,
                        capture_output=True,
                        timeout=300,
                    )

                    if os.path.exists(temp_input):
                        os.remove(temp_input)

                    try:
                        os.makedirs(cache_dir, exist_ok=True)
                        shutil.copy(temp_output, cached_file)
                    except Exception as cache_err:
                        print(f"[pretranscode] Cache write failed: {cache_err}")

                new_clip = dict(clip)
                new_clip["src"] = f"http://127.0.0.1:{port}/temp-clips/clip-{clip_id}.mp4"
                print(f"[pretranscode] Clip {clip_id} ready.")
                return clip_id, new_clip
            except Exception as e:
                print(f"[pretranscode] Failed clip {clip_id}: {e}. Keeping original.")
                return clip_id, clip
        else:
            return clip_id, clip

    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {executor.submit(process_clip, cid, clip): cid for cid, clip in clips.items()}
        for future in concurrent.futures.as_completed(futures):
            cid = futures[future]
            try:
                clip_id, processed_clip = future.result()
                transcoded_clips[clip_id] = processed_clip
            except Exception as e:
                print(f"[pretranscode] Thread error for clip {cid}: {e}")
                transcoded_clips[cid] = clips[cid]

    new_project = dict(project)
    new_project["clips"] = transcoded_clips
    return new_project


# ---------------------------------------------------------------------------
# R2/Cloudflare storage uploader
# ---------------------------------------------------------------------------

def upload_to_r2(file_data: bytes, key: str) -> str:
    """Upload raw bytes to Cloudflare R2 and return the public URL."""
    account_id = os.getenv("R2_ACCOUNT_ID")
    access_key_id = os.getenv("R2_ACCESS_KEY_ID")
    secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY")
    bucket_name = os.getenv("R2_BUCKET_NAME", "scenify-dev")
    public_domain = os.getenv("R2_PUBLIC_DOMAIN", "https://cdn.scenify.io")

    if not all([account_id, access_key_id, secret_access_key]):
        raise ValueError("R2 credentials not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)")

    if not HAS_BOTO3:
        raise ImportError("boto3 package is not installed.")

    content_type = "video/mp4"
    if key.lower().endswith(".mp3"):
        content_type = "audio/mpeg"
    elif key.lower().endswith(".png"):
        content_type = "image/png"
    elif key.lower().endswith((".jpg", ".jpeg")):
        content_type = "image/jpeg"

    print(f"[renderer] Uploading {len(file_data)} bytes to R2 key '{key}'...")

    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        config=Config(signature_version="s3v4"),
    )

    s3.put_object(Bucket=bucket_name, Key=key, Body=file_data, ContentType=content_type)

    public_url = f"{public_domain.rstrip('/')}/{key.lstrip('/')}"
    print(f"[renderer] Upload complete: {public_url}")
    return public_url


# ---------------------------------------------------------------------------
# Playwright Browser Rendering
# ---------------------------------------------------------------------------

async def execute_playwright_render(
    port: int,
    project: dict,
    compositor_options: dict,
    run_headless: bool = True,
    timeout_ms: int = 600_000,
) -> bytes:
    """Launch Playwright Chromium, render the project, return video bytes."""
    print(f"[renderer] Launching Chromium (headless={run_headless})...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=run_headless,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-setuid-sandbox",
                "--disable-background-timer-throttling",
                "--disable-renderer-backgrounding",
                "--disable-backgrounding-occluded-windows",
                "--enable-features=WebCodecs,MediaRecorder,AudioEncoder,VideoEncoder",
                "--enable-blink-features=WebCodecs",
                "--enable-accelerated-video-encode",
                "--enable-accelerated-video-decode",
                "--enable-accelerated-video",
                "--enable-media-stream",
                "--autoplay-policy=no-user-gesture-required",
            ] + ([
                "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
            ] if run_headless else [
                "--ignore-gpu-blocklist",
                "--enable-gpu",
            ]),
        )

        try:
            page = await browser.new_page()
            page.set_default_timeout(0)
            page.set_default_navigation_timeout(60_000)

            print("[renderer] Injecting project data...")
            project_json_str = json.dumps(project)
            options_json_str = json.dumps(compositor_options)
            init_script = f"""
            window.__PROJECT_DATA__ = {project_json_str};
            window.__COMPOSITOR_OPTIONS__ = {options_json_str};
            """
            await page.add_init_script(init_script)

            async def on_progress(v: float):
                print(f"[renderer] Progress: {v*100:.1f}%")

            await page.expose_function("__onProgress__", on_progress)

            page.on("console", lambda msg: print(f"[browser:{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)
            page.on("pageerror", lambda err: print(f"[browser:pageerror] {err.message}"))

            url = f"http://127.0.0.1:{port}"
            print(f"[renderer] Navigating to {url}...")
            await page.goto(url, wait_until="load", timeout=60_000)

            print("[renderer] Waiting for render to complete...")
            await page.wait_for_function(
                "() => window.__RENDER_COMPLETE__ || window.__RENDER_ERROR__",
                timeout=timeout_ms,
            )

            render_error = await page.evaluate("() => window.__RENDER_ERROR__")
            if render_error:
                raise Exception(f"Compositor error: {render_error}")

            print("[renderer] Extracting video blob...")
            base64_data = await page.evaluate("""async () => {
                const blob = window.__VIDEO_BLOB__;
                if (!blob) throw new Error("__VIDEO_BLOB__ not set after render complete");
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }""")

            video_bytes = base64.b64decode(base64_data)
            print(f"[renderer] Done! {len(video_bytes) / 1024 / 1024:.2f} MB")
            return video_bytes
        finally:
            await browser.close()


# ---------------------------------------------------------------------------
# High-level render function (shared by local and Modal)
# ---------------------------------------------------------------------------

async def render_video(project: dict, options: Optional[dict] = None) -> Union[bytes, dict]:
    """Render an OpenVideo project JSON to MP4.

    Args:
        project: Timeline project JSON (settings, tracks, clips).
        options: Render options (width, height, fps, bitrate, r2_key, etc.)

    Returns:
        Raw MP4 bytes, or dict with R2 URL if r2_key is provided.
    """
    if options is None:
        options = {}

    format_opt = options.get("format", "mp4")
    video_codec = options.get("videoCodec", "avc1.640033")
    bitrate = options.get("bitrate", 12_000_000)
    audio = options.get("audio", True)
    audio_codec = options.get("audioCodec", "opus")
    audio_sample_rate = options.get("audioSampleRate", 48_000)
    prioritize_speed = options.get("prioritizeSpeed", False)
    timeout_ms = options.get("timeout", 600_000)

    settings = project.get("settings", {})
    compositor_options = {
        "width": options.get("width") or settings.get("width") or 1920,
        "height": options.get("height") or settings.get("height") or 1080,
        "fps": options.get("fps") or settings.get("fps") or 30,
        "backgroundColor": options.get("backgroundColor") or settings.get("backgroundColor") or "#000000",
        "format": format_opt,
        "videoCodec": video_codec,
        "bitrate": int(bitrate * 0.7) if prioritize_speed else bitrate,
        "audio": audio,
        "audioCodec": audio_codec,
        "audioSampleRate": audio_sample_rate,
        "prioritizeSpeed": prioritize_speed,
    }

    with xvfb_display_context() as xvfb_process:
        # WebCodecs requires full Chromium in headed mode (headless shell doesn't support it)
        # In container: Xvfb provides the display. Locally: native display is available.
        run_headless = False

        with temporary_dir_context() as temp_dir:
            with http_server_context(temp_dir) as port:
                if audio:
                    print("[renderer] Pre-transcoding videos...")
                    project = pretranscode_videos(project, temp_dir, port)

                video_bytes = await execute_playwright_render(
                    port=port,
                    project=project,
                    compositor_options=compositor_options,
                    run_headless=run_headless,
                    timeout_ms=timeout_ms,
                )

                r2_key = options.get("r2_key")
                if r2_key:
                    public_url = upload_to_r2(video_bytes, r2_key)
                    return {"url": public_url, "size": len(video_bytes)}

                return video_bytes
