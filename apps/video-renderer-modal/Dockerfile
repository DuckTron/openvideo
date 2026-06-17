# Dockerfile for OpenVideo Video Renderer
#
# Mirrors the Modal container image defined in src/api/main.py
# so you can run renders locally via Docker without Modal.
#
# Build:
#   docker build -t openvideo-renderer .
#
# Run (file-based):
#   docker run --rm \
#     -v $(pwd)/src/api/data-with-params.json:/data/project.json \
#     -v $(pwd)/outputs:/outputs \
#     openvideo-renderer /data/project.json /outputs/video.mp4
#
# Run (with R2 upload):
#   docker run --rm \
#     -e R2_ACCOUNT_ID=xxx \
#     -e R2_ACCESS_KEY_ID=xxx \
#     -e R2_SECRET_ACCESS_KEY=xxx \
#     -e R2_BUCKET_NAME=xxx \
#     -e R2_PUBLIC_DOMAIN=https://cdn.example.com \
#     -v $(pwd)/src/api/data-with-params.json:/data/project.json \
#     openvideo-renderer /data/project.json

# ---------------------------------------------------------------------------
# Base: Debian Bookworm with Python 3.11
# ---------------------------------------------------------------------------
FROM python:3.11-slim-bookworm

# ---------------------------------------------------------------------------
# 1. System dependencies: ffmpeg, curl, Node.js 22
# ---------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# 2. Python dependencies
# ---------------------------------------------------------------------------
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

# ---------------------------------------------------------------------------
# 3. Playwright Chromium + system deps (libnss3, libgbm1, etc.)
#    We need FULL Chromium (not headless shell) for WebCodecs support
# ---------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends xvfb && rm -rf /var/lib/apt/lists/*
RUN playwright install --with-deps chromium

# ---------------------------------------------------------------------------
# 4. Install @openvideo/engine-pixi (browser bundle served to Playwright)
# ---------------------------------------------------------------------------
RUN mkdir -p /app && cd /app && npm install @openvideo/engine-pixi@1.1.5

# ---------------------------------------------------------------------------
# 5. Copy application code
# ---------------------------------------------------------------------------
WORKDIR /app

COPY renderer.html /app/renderer.html
COPY src/ /app/src/

# Create output directory
RUN mkdir -p /outputs

# ---------------------------------------------------------------------------
# 6. Environment
# ---------------------------------------------------------------------------
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

# ---------------------------------------------------------------------------
# 7. Entrypoint: run the local CLI harness
#    Usage: docker run <image> <project.json> [output.mp4]
# ---------------------------------------------------------------------------
ENTRYPOINT ["python3", "-u", "/app/src/api/render_local.py"]
CMD ["--help"]
