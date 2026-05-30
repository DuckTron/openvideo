import { NextRequest, NextResponse } from "next/server";
import { OpenVideo } from "@openvideo/ai";
import { auth } from "@/lib/auth";
import * as crypto from "crypto";

const baseURL = process.env.DIRECTOR_URL || "http://localhost:4000";
const jwtSecret = process.env.JWT_SECRET || "your-better-auth-secret";

// Helper to sign a JWT on the fly
function signJwt(payload: any, secret: string): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const base64UrlEncode = (obj: any) => {
    return Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);

  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Map a Space object from Director to the legacy Project structure expected by the frontend
function mapSpaceToProject(space: any): any {
  return {
    id: space.id,
    name: space.name,
    description: space.description ?? null,
    spaceId: space.id,
    thumbnail: space.thumbnail ?? null,
    width: space.width,
    height: space.height,
    fps: space.fps,
    data: space.scene ?? { tracks: [], clips: {}, settings: {} },
    userId: space.userId,
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
  };
}

// Get authenticated user session
async function getSession(request: NextRequest) {
  return await auth.api.getSession({ headers: request.headers });
}

// GET /api/projects/[id] - Get a specific project
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(request);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const token = signJwt(
      {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      jwtSecret,
    );

    const openVideo = new OpenVideo({
      mode: "direct",
      accessToken: token,
      baseURL,
    });

    try {
      const space = await openVideo.spaces.get({ id });
      return NextResponse.json(mapSpaceToProject(space));
    } catch (error: any) {
      if (error.status === 404) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(request);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, data } = body;

    const token = signJwt(
      {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      jwtSecret,
    );

    const openVideo = new OpenVideo({
      mode: "direct",
      accessToken: token,
      baseURL,
    });

    // In the old schema updates could send partial space settings/metadata
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (data !== undefined) {
      updateData.scene = data;
      if (data.settings?.width !== undefined) updateData.width = data.settings.width;
      if (data.settings?.height !== undefined) updateData.height = data.settings.height;
      if (data.settings?.fps !== undefined) updateData.fps = data.settings.fps;
    }

    try {
      const updatedSpace = await openVideo.spaces.update({
        id,
        ...updateData,
      });
      return NextResponse.json(mapSpaceToProject(updatedSpace));
    } catch (error: any) {
      if (error.status === 404) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(request);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const token = signJwt(
      {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      jwtSecret,
    );

    const openVideo = new OpenVideo({
      mode: "direct",
      accessToken: token,
      baseURL,
    });

    try {
      await openVideo.spaces.delete({ id });
      return NextResponse.json({ success: true });
    } catch (error: any) {
      if (error.status === 404) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
