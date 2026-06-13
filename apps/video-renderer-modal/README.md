# OpenVideo Video Renderer (Modal.com)

A serverless, GPU/CPU-accelerated video rendering service built on Modal.com. It spins up a headless container running Playwright Chromium with WebCodecs, loads `@openvideo/engine-pixi` and `renderer.html` dynamically over a local Python-threaded HTTP server, processes the input project timeline JSON, and compiles the final MP4 video binary.

It also supports direct integration with Cloudflare R2 to upload the output video and return a public URL CDN endpoint.

---

## Architecture

1. **Pre-transcoding**: Any remote video clips with audio tracks are downloaded and transcoded to a browser-compatible MP4 format with Opus audio using FFmpeg in Python. This guarantees WebCodecs decoding compatibility inside headless Chromium.
2. **Local HTTP Server**: At runtime, the function spins up a standard Python `http.server` in a background daemon thread on a random free port to serve `renderer.html` and the container's `@openvideo/engine-pixi/dist` bundle dynamically.
3. **Playwright Compositor**: Headless Chromium is initialized with hardware acceleration, audio encoding, and WebCodecs flags enabled. It loads the PixiJS compositor timeline and exports individual frames.
4. **Data Transfer**: The resulting video binary Blob is read via `FileReader` and transferred as base64 bytes to the Python environment.
5. **R2 Upload (Optional)**: If `r2_key` is supplied, the video bytes are uploaded directly to the Cloudflare R2 storage bucket using `boto3`, returning the public URL.

---

## Configuration

To run or deploy the service, create a `.env` file in the root of the workspace:

```bash
# apps/video-renderer-modal/.env

# Cloudflare R2 Credentials
R2_PUBLIC_DOMAIN="https://cdn.scenify.io"
R2_BUCKET_NAME="scenify-dev"
R2_ACCESS_KEY_ID="your_access_key"
R2_SECRET_ACCESS_KEY="your_secret_key"
R2_ACCOUNT_ID="your_account_id"

# Modal configurations (if not using global credentials)
MODAL_TOKEN="your_modal_token"
MODAL_WORKSPACE="your_modal_workspace"
```

---

## Setup & Local Testing

### Prerequisites

1. Install Modal CLI and authenticate:
   ```bash
   pip install modal
   python3 -m modal setup
   ```
2. Install local Python dependencies:
   ```bash
   pip install -r requirements.txt
   python3 -m playwright install chromium
   ```

### Running Locally (Offline Mode)

To test the compositor rendering and pre-transcoding pipelines locally on your machine without building/deploying a cloud image:

```bash
# From the apps/video-renderer-modal directory:
python3 src/api/main.py src/api/data-with-params.json test-output.mp4
```

- If `R2_ACCOUNT_ID` is defined in your `.env` file, the script will automatically test R2 uploading and output the public URL (e.g. `https://cdn.scenify.io/tests/local-test-render.mp4`).
- If no credentials are found in the environment, it will fallback to writing the video binary locally to `test-output.mp4`.

---

## Deployment to Modal.com

To deploy the service to your Modal cloud environment:

```bash
# From apps/video-renderer-modal:
python3 -m modal deploy src/api/main.py
```

Upon successful deployment, the container image containing Node 22, Playwright Chromium, FFmpeg, and `@openvideo/engine-pixi` is built and registered on the Modal cloud registry, making it instantly callable.

---

## Invoking from Other Applications

### 1. From Node.js / TypeScript (Next.js & NestJS Services)

To call this service from Node.js, use the `@openvideo` shared `modal` package.

#### Returning the Public R2 URL (Recommended)

By passing `r2_key` in the options object, the serverless function performs the upload directly in the cloud container, returning a URL dictionary. This avoids transferring megabytes of binary video data back to your Node backend:

```typescript
import { ModalClient } from "modal";

async function renderVideoToR2(projectJson: any, assetId: string) {
  const modal = new ModalClient();
  const renderVideo = await modal.functions.fromName("openvideo-video-renderer", "render_video");

  // Invoke the remote Modal function
  const result = await renderVideo.remote([
    projectJson,
    {
      r2_key: `assets/${assetId}/rendered.mp4`,
      prioritizeSpeed: true,
    },
  ]);

  console.log("Uploaded Video URL:", result.url); // e.g. https://cdn.scenify.io/assets/asset_id/rendered.mp4
  console.log("Video Size (Bytes):", result.size);

  return result.url;
}
```

#### Returning Raw Binary Buffer (Transfer Mode)

If you do not specify an `r2_key`, the remote function returns the raw video bytes. Node.js receives this as a binary `Buffer`:

```typescript
import { ModalClient } from "modal";
import * as fs from "fs/promises";

async function renderVideoToLocalFile(projectJson: any) {
  const modal = new ModalClient();
  const renderVideo = await modal.functions.fromName("openvideo-video-renderer", "render_video");

  // Returns binary video bytes buffer
  const videoBuffer = await renderVideo.remote([
    projectJson,
    {
      prioritizeSpeed: false,
      width: 1920,
      height: 1080,
    },
  ]);

  await fs.writeFile("local-render-output.mp4", videoBuffer);
  console.log("Rendered file written locally!");
}
```

---

### 2. From Python Clients (AI or background processors)

If calling from another python microservice on Modal or standard python scripts, use the `modal.Function` API:

```python
import modal
import json

def trigger_render():
    # Retrieve the deployed function reference
    render_video = modal.Function.lookup("openvideo-video-renderer", "render_video")

    with open("project.json") as f:
        project_data = json.load(f)

    # Trigger remote rendering with R2 upload destination
    result = render_video.remote(project_data, {
        "r2_key": "renders/clip-abc.mp4",
        "width": 1080,
        "height": 1920,
        "prioritizeSpeed": True
    })

    print(f"Serverless render URL: {result['url']}")

if __name__ == "__main__":
    trigger_render()
```
