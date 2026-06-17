"""Local/Docker video rendering CLI. No Modal dependency.

Usage:
    python3 render_local.py <project_json_path> [output_video_path]

Environment variables (for R2 upload):
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
    R2_BUCKET_NAME, R2_PUBLIC_DOMAIN
"""

import os
import sys
import json
import asyncio
import time

os.environ["PYTHONUNBUFFERED"] = "1"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from renderer import render_video, RENDERER_HTML_PATH, ENGINE_DIST_PATH, IS_CONTAINER


async def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("--help", "-h"):
        print("Usage: python3 render_local.py <project_json_path> [output_video_path]")
        print("")
        print("Environment variables:")
        print("  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY  - Upload to R2")
        print("  R2_BUCKET_NAME, R2_PUBLIC_DOMAIN                       - R2 bucket config")
        sys.exit(0 if "--help" in sys.argv or "-h" in sys.argv else 1)

    project_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "output.mp4"

    print(f"[local] Loading project: {project_path}")
    with open(project_path, "r") as f:
        project_data = json.load(f)

    print(f"[local] renderer.html: {RENDERER_HTML_PATH}")
    print(f"[local] engine-pixi dist: {ENGINE_DIST_PATH}")
    print(f"[local] IS_CONTAINER: {IS_CONTAINER}")

    render_options = {"prioritizeSpeed": True}
    if os.getenv("R2_ACCOUNT_ID"):
        render_options["r2_key"] = f"renders/local-{int(time.time())}.mp4"

    start = time.time()
    print("[local] Starting render...")
    result = await render_video(project_data, render_options)
    elapsed = time.time() - start

    if isinstance(result, dict):
        print(f"[local] Uploaded to R2: {result['url']}")
        print(f"[local] Size: {result['size'] / 1024 / 1024:.2f} MB")
    else:
        print(f"[local] Writing {len(result) / 1024 / 1024:.2f} MB to: {output_path}")
        with open(output_path, "wb") as f:
            f.write(result)

    print(f"[local] Completed in {elapsed:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
