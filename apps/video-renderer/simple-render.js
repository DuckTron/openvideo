/**
 * simple-render.js
 *
 * Launches a local HTTP server so that:
 *  - renderer.html is served at GET /
 *  - The @openvideo/engine-pixi dist is served at GET /engine-pixi/...
 *
 * Playwright then navigates to http://localhost:<PORT> instead of
 * file:// so that the ES-module import map resolves correctly.
 */

import { chromium } from "playwright";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startStaticServer() {
  const app = express();

  // Serve renderer.html at the root
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "renderer.html"));
  });

  // Serve the engine-pixi dist at /engine-pixi/
  const engineDistPath = path.join(__dirname, "node_modules", "@openvideo", "engine-pixi", "dist");
  app.use("/engine-pixi", express.static(engineDistPath, { dotfiles: "allow" }));

  return new Promise((resolve) => {
    const server = createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function renderVideo() {
  const { server, port } = await startStaticServer();
  const url = `http://127.0.0.1:${port}`;
  console.log(`✅ Static server running at ${url}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });

  try {
    const page = await browser.newPage();
    // Disable Playwright's 30 s default timeout — render can take several minutes.
    page.setDefaultTimeout(0);
    page.setDefaultNavigationTimeout(60_000);

    // Pipe browser console to Node stdout so errors are visible
    page.on("console", (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
    page.on("pageerror", (err) => console.error("[browser] page error:", err.message));

    console.log("🌐 Navigating to renderer page...");
    await page.goto(url, {
      waitUntil: "load", // fires once the HTML is parsed & load event fired
      timeout: 60_000, // 60 s to load the page itself
    });

    // Wait up to 10 minutes for renderComplete to be set by renderer.html
    console.log("⏳ Waiting for render to complete...");
    await page.waitForFunction(() => window.renderComplete || window.renderError, {
      timeout: 600_000,
    });

    // Check for errors
    const renderError = await page.evaluate(() => window.renderError);
    if (renderError) {
      throw new Error(`Render failed in browser: ${renderError}`);
    }

    // Extract video blob as a Uint8Array transferred via base64
    console.log("📦 Extracting video data from browser...");
    const base64Data = await page.evaluate(async () => {
      const blob = window.videoBlob;
      if (!blob) throw new Error("window.videoBlob is not set");
      const arrayBuffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // Convert to base64 in chunks to avoid stack overflow on large files
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        binary += String.fromCharCode(...uint8.slice(i, i + chunkSize));
      }
      return btoa(binary);
    });

    // Write output file
    const outputPath = path.join(__dirname, "output.mp4");
    const buffer = Buffer.from(base64Data, "base64");
    await fs.writeFile(outputPath, buffer);

    console.log(`✅ Video saved: ${outputPath} (${buffer.length} bytes)`);
  } finally {
    await browser.close();
    server.close();
    console.log("🔒 Server closed");
  }
}

renderVideo().catch((err) => {
  console.error("❌ Render failed:", err);
  process.exit(1);
});
