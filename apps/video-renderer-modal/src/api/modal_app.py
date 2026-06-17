"""Modal.com serverless deployment wrapper.

Imports shared rendering logic from renderer.py and exposes it as Modal functions.

Deploy:
    modal deploy src/api/modal_app.py
"""

import os
import modal
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Modal App Definition
# ---------------------------------------------------------------------------

app = modal.App("openvideo-video-renderer")

# Path to renderer.html relative to this file
RENDERER_HTML_MOUNT_PATH = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "renderer.html")
)

# Container image with all rendering dependencies
image = (
    modal.Image.debian_slim()
    .apt_install("curl", "ffmpeg")
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
        "apt-get install -y nodejs",
    )
    .pip_install("playwright>=1.40.0", "boto3>=1.28.0", "python-dotenv>=1.0.0")
    .run_commands("playwright install --with-deps chromium")
    .run_commands(
        "mkdir -p /app",
        "cd /app && npm install @openvideo/engine-pixi@1.1.5",
    )
    .add_local_file(RENDERER_HTML_MOUNT_PATH, "/app/renderer.html")
    .add_local_file(
        os.path.join(os.path.dirname(__file__), "renderer.py"),
        "/app/src/api/renderer.py",
    )
)

# R2 Secrets
r2_secret = modal.Secret.from_dict({
    "R2_ACCOUNT_ID": os.getenv("R2_ACCOUNT_ID", ""),
    "R2_ACCESS_KEY_ID": os.getenv("R2_ACCESS_KEY_ID", ""),
    "R2_SECRET_ACCESS_KEY": os.getenv("R2_SECRET_ACCESS_KEY", ""),
    "R2_BUCKET_NAME": os.getenv("R2_BUCKET_NAME", "scenify-dev"),
    "R2_PUBLIC_DOMAIN": os.getenv("R2_PUBLIC_DOMAIN", "https://cdn.scenify.io"),
})


# ---------------------------------------------------------------------------
# Modal Functions
# ---------------------------------------------------------------------------

@app.function(
    image=image,
    timeout=600,
    memory=2048,
    cpu=8.0,
    secrets=[r2_secret],
)
async def render_video_modal(project: dict, options: dict = None):
    """Modal function that wraps the shared render_video logic.

    Args:
        project: OpenVideo ProjectJSON dict.
        options: Render options (width, height, fps, bitrate, r2_key, etc.)

    Returns:
        bytes (raw MP4) or dict with R2 upload URL.
    """
    import sys
    sys.path.insert(0, "/app/src/api")
    from renderer import render_video

    return await render_video(project, options)


@app.function(image=image, timeout=30)
async def health_check():
    """Simple health check for the Modal deployment."""
    return {"status": "healthy", "service": "openvideo-video-renderer"}
