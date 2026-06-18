# OpenVideo Video Renderer

Video rendering service powered by Playwright Chromium + WebCodecs and `@openvideo/engine-pixi`. Accepts a project timeline JSON and outputs a compiled MP4 video with audio.

Supports three execution modes: **local** (bare metal), **Docker**, and **Modal.com** (serverless).

---

## Architecture

1. **Pre-transcoding** — Remote video clips are downloaded and transcoded to MP4 with Opus audio via FFmpeg, ensuring WebCodecs decoding compatibility.
2. **HTTP Server** — A Python `http.server` daemon serves `renderer.html` and the `@openvideo/engine-pixi/dist` bundle on a random local port.
3. **Playwright Compositor** — Full Chromium launches with WebCodecs flags, loads the compositor, and renders the timeline frame-by-frame.
4. **Data Transfer** — The resulting video Blob is extracted as base64 bytes from the browser.
5. **R2 Upload (Optional)** — If `r2_key` is provided, the video is uploaded to Cloudflare R2 and a public URL is returned.

### File Structure

```
src/api/
├── renderer.py        # Shared rendering core (no Modal dependency)
├── render_local.py    # Local / Docker CLI entrypoint
├── serve_cloudrun.py  # Cloud Run HTTP server wrapper
├── modal_app.py       # Modal.com deployment wrapper
└── main.py            # Legacy Modal entrypoint (uses Modal SDK directly)
```

---

## Configuration

Create a `.env` file in this directory:

```bash
# Cloudflare R2 (optional — omit to write files locally)
R2_ACCOUNT_ID="your_account_id"
R2_ACCESS_KEY_ID="your_access_key"
R2_SECRET_ACCESS_KEY="your_secret_key"
R2_BUCKET_NAME="scenify-dev"
R2_PUBLIC_DOMAIN="https://cdn.scenify.io"

# Modal.com (only needed for Modal deployment)
MODAL_TOKEN="your_modal_token"
MODAL_WORKSPACE="your_modal_workspace"
```

---

## 1. Running Locally (Without Docker)

Runs directly on your machine using your local Chromium and FFmpeg.

### Prerequisites

```bash
pip install -r requirements.txt
python3 -m playwright install chromium
```

Also ensure `ffmpeg` is installed (`brew install ffmpeg` on macOS).

### Run

```bash
# Render to a local file
python3 src/api/render_local.py src/api/data-with-params.json output.mp4

# Render and upload to R2 (if R2_ACCOUNT_ID is set in .env)
python3 src/api/render_local.py src/api/data-with-params.json
```

- Uses the monorepo's `packages/engine-pixi/dist` if available, otherwise falls back to a local `node_modules` install.
- If R2 credentials are present, the video is uploaded and the URL is printed. Otherwise it writes to the specified output path.

---

## 2. Running with Docker

Self-contained image with all dependencies (Python, Node.js, FFmpeg, Chromium, Xvfb, engine-pixi@1.2.0).

### Build

```bash
docker build -t openvideo-renderer .
```

### Run (save to local file)

```bash
docker run --rm --shm-size=2g \
  -v $(pwd)/src/api/data-with-params.json:/data/project.json \
  -v $(pwd)/outputs:/outputs \
  openvideo-renderer /data/project.json /outputs/video.mp4
```

### Run (upload to R2)

```bash
docker run --rm --shm-size=2g \
  -e R2_ACCOUNT_ID=your_account_id \
  -e R2_ACCESS_KEY_ID=your_access_key \
  -e R2_SECRET_ACCESS_KEY=your_secret_key \
  -e R2_BUCKET_NAME=scenify-dev \
  -e R2_PUBLIC_DOMAIN=https://cdn.scenify.io \
  -v $(pwd)/src/api/data-with-params.json:/data/project.json \
  openvideo-renderer /data/project.json
```

> **Note:** `--shm-size=2g` is required — Chromium needs shared memory for rendering.

---

## 3. Deploying to Modal.com

Serverless cloud execution with auto-scaling. The Modal wrapper (`modal_app.py`) imports the shared `renderer.py` core.

### Prerequisites

```bash
pip install modal
python3 -m modal setup
```

### Deploy

```bash
python3 -m modal deploy src/api/modal_app.py
```

This builds and registers a container image on Modal's cloud with Node 22, Playwright Chromium, FFmpeg, and `@openvideo/engine-pixi@1.2.0`.

### Invoke from Python

```python
import modal
import json

render_fn = modal.Function.lookup("openvideo-video-renderer", "render_video_modal")

with open("project.json") as f:
    project_data = json.load(f)

result = render_fn.remote(project_data, {
    "r2_key": "renders/my-video.mp4",
    "width": 1080,
    "height": 1920,
    "prioritizeSpeed": True,
})

print(f"URL: {result['url']}")
```

### Invoke from Node.js / TypeScript

```typescript
import { ModalClient } from "modal";

const modal = new ModalClient();
const renderVideo = await modal.functions.fromName(
  "openvideo-video-renderer",
  "render_video_modal"
);

// With R2 upload (recommended — avoids transferring large binaries)
const result = await renderVideo.remote([projectJson, {
  r2_key: `renders/${Date.now()}.mp4`,
  prioritizeSpeed: true,
}]);
console.log("URL:", result.url);

// Without R2 — returns raw MP4 bytes
const videoBuffer = await renderVideo.remote([projectJson, {}]);
await fs.writeFile("output.mp4", videoBuffer);
```

---

## 4. Deploying to Google Cloud Run

Serverless Docker deployment on GCP. Uses Gen1 execution environment with Xvfb for headed Chromium rendering.

### Prerequisites

- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated
- A GCP project with billing enabled
- Docker installed locally

### Step 1: Set GCP Project

```bash
gcloud config set project YOUR_PROJECT_ID
```

### Step 2: Enable Required APIs

```bash
gcloud services enable artifactregistry.googleapis.com run.googleapis.com --quiet
```

### Step 3: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create openvideo \
  --repository-format=docker \
  --location=us-central1 \
  --quiet
```

### Step 4: Authenticate Docker with Artifact Registry

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
```

### Step 5: Build the Docker Image (linux/amd64)

```bash
docker build --platform linux/amd64 \
  -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/openvideo/renderer:latest .
```

### Step 6: Push to Artifact Registry

```bash
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/openvideo/renderer:latest
```

### Step 7: Deploy to Cloud Run

```bash
gcloud run deploy openvideo-renderer \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/openvideo/renderer:latest \
  --region=us-central1 \
  --platform=managed \
  --memory=4Gi \
  --cpu=8 \
  --timeout=600 \
  --concurrency=1 \
  --max-instances=2 \
  --no-cpu-throttling \
  --cpu-boost \
  --execution-environment=gen1 \
  --command="python3,-u,/app/src/api/serve_cloudrun.py" \
  --port=8080 \
  --set-env-vars="R2_ACCOUNT_ID=xxx,R2_ACCESS_KEY_ID=xxx,R2_SECRET_ACCESS_KEY=xxx,R2_BUCKET_NAME=xxx,R2_PUBLIC_DOMAIN=https://cdn.example.com" \
  --allow-unauthenticated \
  --quiet
```

Replace `YOUR_PROJECT_ID` with your GCP project ID and fill in the R2 env vars.

### Step 8: Verify Deployment

```bash
curl https://YOUR_SERVICE_URL/health
# {"status": "healthy", "service": "openvideo-renderer"}
```

### API Usage

**POST /render** — Render a video from project JSON.

```bash
curl -X POST \
  https://YOUR_SERVICE_URL/render \
  -H "Content-Type: application/json" \
  -d '{
    "project": { ...your ProjectJSON... },
    "options": {
      "r2_key": "renders/my-video.mp4",
      "audioCodec": "opus"
    }
  }'
```

**Response** (when `r2_key` is provided):
```json
{"url": "https://cdn.example.com/renders/my-video.mp4", "size": 16685783}
```

If `r2_key` is omitted, the response is raw MP4 bytes with `Content-Type: video/mp4`.

### Performance Notes

- Cloud Run Gen1 with 8 CPUs: **~90s** for a typical 12s video render
- Cold starts add ~10-15s extra on first request
- For faster renders (~26s), use Modal.com deployment instead

### Cleanup

```bash
gcloud run services delete openvideo-renderer --region=us-central1 --quiet
gcloud artifacts repositories delete openvideo --location=us-central1 --quiet
```

---

## Render Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `width` | number | from project settings | Output video width |
| `height` | number | from project settings | Output video height |
| `fps` | number | from project settings | Frames per second |
| `bitrate` | number | `12000000` | Video bitrate in bps |
| `videoCodec` | string | `"avc1.640033"` | H.264 codec profile |
| `audio` | boolean | `true` | Include audio track |
| `audioCodec` | string | `"opus"` | Audio codec (opus recommended) |
| `audioSampleRate` | number | `48000` | Audio sample rate |
| `prioritizeSpeed` | boolean | `false` | Reduce bitrate by 30% for faster rendering |
| `r2_key` | string | — | R2 object key; if set, uploads and returns `{url, size}` |
| `timeout` | number | `600000` | Render timeout in ms |
