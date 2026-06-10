import { renderVideo } from "./src/index.js";
import fs from "fs/promises";

async function main() {
  // Load your project (clips, tracks)
  const projectData = await fs.readFile("./data.json", "utf-8");
  const project = JSON.parse(projectData);

  // Render with your exact parameters
  const buffer = await renderVideo(project, {
    width: 1080,
    height: 1920,
    fps: 30,
    backgroundColor: "#111111",
    format: "mp4",
    videoCodec: "avc1.640033",
    bitrate: 12000000,
    audio: true,
    audioCodec: "aac",
    audioSampleRate: 48000,
    prioritizeSpeed: true,
    onProgress: (p) => process.stdout.write(`\r${(p * 100).toFixed(0)}%`),
    outputPath: "./output-params.mp4",
  });

  console.log(`\n✅ Done — ${(buffer.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("❌ Render failed:", err.message);
  process.exit(1);
});
