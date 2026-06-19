import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

// animAI: uploads LOCAIS (substitui o R2/Cloudflare). Devolvemos um presignedUrl
// que aponta para o nosso endpoint PUT (/api/uploads/put/...), que grava em
// apps/app/public/uploads/, servido estaticamente pelo Next. 100% autónomo.

const MIME: Record<string, string> = {
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", svg: "image/svg+xml",
  mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg",
};
const mimeOf = (name: string) => MIME[name.split(".").pop()?.toLowerCase() || ""] || "application/octet-stream";

interface PresignRequest {
  userId?: string;
  fileNames: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { fileNames } = (await request.json()) as PresignRequest;
    if (!Array.isArray(fileNames) || fileNames.length === 0) {
      return NextResponse.json({ error: "fileNames array is required" }, { status: 400 });
    }

    const uploads = fileNames.map((originalName) => {
      const cleanName = originalName.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
      const id = randomUUID();
      const rel = `uploads/${id}/${cleanName}`;
      return {
        fileName: cleanName,
        filePath: rel,
        contentType: mimeOf(cleanName),
        presignedUrl: `/api/uploads/put/${id}/${encodeURIComponent(cleanName)}`,
        url: `/${rel}`, // servido por apps/app/public/
      };
    });

    return NextResponse.json({ success: true, uploads });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
