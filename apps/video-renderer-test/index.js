import { ModalClient } from "modal";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from local .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const projectJsonPath = path.resolve(__dirname, "./data.json");
  console.log(`Reading project JSON from: ${projectJsonPath}`);

  try {
    const projectJsonContent = await fs.readFile(projectJsonPath, "utf-8");
    const projectJson = JSON.parse(projectJsonContent);

    console.log("Initializing ModalClient...");
    const modal = new ModalClient();

    console.log("Retrieving render_video function from openvideo-video-renderer...");
    const renderVideo = await modal.functions.fromName("openvideo-video-renderer", "render_video");

    const assetId = "test-node-" + Date.now();
    const r2Key = `tests/${assetId}.mp4`;
    console.log(`Triggering render_video remotely with r2_key: '${r2Key}'...`);

    const startTime = Date.now();
    const result = await renderVideo.remote([
      projectJson,
      {
        r2_key: r2Key,
        prioritizeSpeed: true,
      },
    ]);
    const durationMs = Date.now() - startTime;

    console.log("\n--- Remote Render Success! ---");
    console.log("Uploaded Video URL:", result.url);
    console.log("Video Size:", (result.size / 1024 / 1024).toFixed(2), "MB");
    console.log("Total Call Duration:", (durationMs / 1000).toFixed(2), "seconds");
  } catch (err) {
    console.error("Execution failed:", err);
  }
}

main();
