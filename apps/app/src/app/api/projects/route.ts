import { NextRequest, NextResponse } from "next/server";
import { OpenVideo } from "@openvideo/ai";
import { auth } from "@/lib/auth";
import * as crypto from "crypto";

const baseURL = process.env.DIRECTOR_URL || "http://localhost:4000";
const jwtSecret = process.env.JWT_SECRET || "your-better-auth-secret";

// Helper to sign a JWT on the fly using built-in crypto module
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

// GET /api/projects - List all projects for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate JWT access token for this user to call Director service
    const token = signJwt(
      {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      },
      jwtSecret,
    );

    const openVideo = new OpenVideo({
      mode: "direct",
      accessToken: token,
      baseURL,
    });

    const spaces = await openVideo.spaces.list();
    const projects = spaces.map(mapSpaceToProject);

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

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

    // Create a new space using the new unified space fields
    const space = await openVideo.spaces.create({
      name,
      description: description || "",
      width: 1080,
      height: 1920,
      fps: 30,
      scene: {
        tracks: [],
        clips: {},
        settings: { width: 1080, height: 1920, fps: 30 },
      },
    });

    return NextResponse.json(mapSpaceToProject(space), { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
