import { type NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// animAI: recebe os bytes do upload (PUT) e grava em apps/app/public/uploads/<...>,
// servido pelo Next em /uploads/<...>. Caminho validado dentro de public/uploads.

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: parts } = await params;
    const rel = parts.map((p) => decodeURIComponent(p)).join("/");
    const dest = path.join(UPLOADS_ROOT, rel);
    if (!dest.startsWith(UPLOADS_ROOT)) {
      return NextResponse.json({ error: "invalid path" }, { status: 400 });
    }
    const buf = Buffer.from(await request.arrayBuffer());
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    return NextResponse.json({ success: true, size: buf.length, url: `/uploads/${rel}` });
  } catch (error) {
    return NextResponse.json(
      { error: "upload failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
