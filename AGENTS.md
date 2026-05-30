# 🚀 OpenVideo Developer & AI Agent Guide (`AGENTS.md`)

Welcome to the OpenVideo monorepo! This document serves as the **source of truth** and **onboarding guide** for AI coding agents and human developers. It describes the project structure, Unified tRPC & Shared Database architecture, database schemas, code conventions, environment configurations, and playbooks for common development tasks.

---

## 🏗️ Architectural Overview

OpenVideo is designed around a **Unified API & Shared Database** pattern within a `pnpm` monorepo.

*   **`apps/app` (Next.js 15)**: The primary frontend client and API gateway. It serves pages to the user and acts as the **API Gateway** hosting the single-route tRPC server endpoint (`/api/trpc`).
*   **`apps/director` (NestJS Fastify)**: A high-performance **background worker and real-time coordinator**. It does not host REST or client-facing API endpoints. Instead, it processes queues (BullMQ), acts as a WebSocket broadcaster (Socket.io), and schedules long-running Trigger.dev serverless tasks.
*   **`packages/api` (tRPC)**: The type-safe communication layer. Contains all tRPC router definitions (procedures, inputs, validation). It acts as the source-of-truth for all client-server communication.
*   **`packages/db` (Drizzle ORM)**: The shared database schema and client. Both Next.js (`apps/app`) and NestJS (`apps/director`) import `@openvideo/db` directly to query a single, unified PostgreSQL instance.
*   **`packages/auth` (Better Auth)**: Shared authentication layer, managing user registration, sessions, magic-links, and API tokens.

### 🔄 Request & Execution Flows

#### 1. Standard Client Action (Type-Safe Mutation/Query)
```mermaid
sequenceDiagram
    participant Client as Next.js Client
    participant NextServer as Next.js API Gateway (apps/app)
    participant TRPC as @openvideo/api Router
    participant DB as PostgreSQL (@openvideo/db)

    Client->>NextServer: tRPC Request (e.g. space.create)
    NextServer->>TRPC: createTRPCContext() & run procedure
    TRPC->>DB: query/mutation using getDB()
    DB-->>TRPC: db row data
    TRPC-->>NextServer: serialized JSON
    NextServer-->>Client: type-safe response
```

#### 2. Background Task Flow (BullMQ / Redis)
For lightweight background processing (e.g. project-level structural indexing or quick updates):
```mermaid
sequenceDiagram
    participant NextServer as Next.js tRPC Procedure
    participant Redis as Redis (BullMQ Queue)
    participant Director as NestJS Worker (apps/director)
    participant Socket as Socket.io Gateway
    participant Client as Client Browser

    NextServer->>Redis: projectIndexQueue.add("index", { spaceId })
    Redis-->>NextServer: job queued
    Director->>Redis: Polls queue & consumes job
    Director->>Director: Run Project Indexer Service
    Director->>Socket: Emit progress to broadcast service
    Socket-->>Client: WebSocket update ("space:progress")
```

#### 3. Heavy/Serverless Task Flow (Trigger.dev v3)
For highly intensive video rendering, asset transcribing, ElevenLabs sound generation, or heavy RAG workflows:
```mermaid
sequenceDiagram
    participant NextServer as Next.js tRPC Procedure
    participant Trigger as Trigger.dev Cloud / Runner
    participant DB as PostgreSQL
    participant R2 as Cloudflare R2

    NextServer->>Trigger: tasks.trigger("index-asset", { assetId })
    Trigger->>Trigger: Boot serverless container (ffmpeg enabled)
    Trigger->>R2: Fetch asset / download video
    Trigger->>Trigger: Extract transcripts, compute vector embeddings
    Trigger->>DB: Save to langchain_pg_embedding & assetTranscript
    Trigger-->>NextServer: Webhook / polling completion
```

---

## 📁 Repository Structure

Below is an annotated outline of the OpenVideo workspace:

```
.
├── apps/
│   ├── app/                    # Next.js 15 App Router app (Frontend, tRPC route handler, Next Pages)
│   │   ├── src/app/            # Route groups: (auth), (home), (marketing), edit, editor, api/trpc/
│   │   └── src/lib/trpc.ts     # Client tRPC configuration (uses SuperJSON transformer)
│   ├── director/               # NestJS background worker, BullMQ consumer, and Socket.io gateway
│   │   ├── src/broadcast/      # Redis-backed Socket.io websocket adapter & gateway
│   │   ├── src/indexing/       # NestJS services performing indexing, metadata updates, etc.
│   │   ├── src/main.ts         # Fastify-based NestJS bootstrapper (running on Port 4000)
│   │   └── trigger/            # Trigger.dev v3 task handlers (elevenlabs, asset indexer, media gen)
│   └── docs/                   # Documentation website
├── packages/
│   ├── ai/                     # Gemini API client, Prompt templates, RAG resources, utility methods
│   ├── api/                    # Shared tRPC routers (procedures & AppRouter type definition)
│   │   ├── src/routers/        # Routers: project, space, asset, chat, indexing, token
│   │   ├── src/handler.ts      # Next.js route handler builder (createTRPCRouteHandler)
│   │   └── src/trpc.ts         # Base tRPC context and builder definitions
│   ├── auth/                   # Better Auth wrapper (magic link, GitHub OAuth, token validation)
│   ├── core/                   # Main timeline engine schemas, configurations, playback state, commands
│   ├── db/                     # Shared PostgreSQL DB client and schemas using Drizzle ORM
│   │   ├── src/schema/         # Schemas: auth.ts, project.ts, asset.ts
│   │   └── src/index.ts        # Exports getDB(), getPool(), and all table schemas
│   ├── engine-pixi/            # Canvas-based PixiJS video/animation rendering and compositor engine
│   └── timeline/               # UI Timeline editor component, track manager, fabric.js objects
├── package.json                # Monorepo setup scripts
├── turbo.json                  # Turborepo build pipeline configuration
└── pnpm-workspace.yaml         # PNPM package workspace definition
```

---

## 💾 Shared Database Schema (`@openvideo/db`)

All tables are managed inside `@openvideo/db`. Use PostgreSQL as the target engine.

### Schemas Quick Reference

#### 🔑 Auth Schema (`packages/db/src/schema/auth.ts`)
*   **`user`**: User accounts (name, email, emailVerified, image, createdAt, updatedAt).
*   **`session`**: Active login sessions (expiresAt, token, ipAddress, userAgent, userId).
*   **`account`**: Auth credentials (accountId, providerId, userId, password, accessToken, etc.).
*   **`verification`**: Token-based verification (identifier, value, expiresAt).
*   **`apiToken`**: Custom API tokens with prefix `ov_live_` for programmatic API access.

#### 🎥 Project Schema (`packages/db/src/schema/project.ts`)
*   **`project`**: Single editing project details (name, description, thumbnail, width, height, fps, JSON data, userId, spaceId).
*   **`space`**: Video organization workspaces (name, userId, JSON data).
*   **`directorSession`**: AI director agent state sessions (spaceId, userId, historyJson, pendingPlan, activePlanId).

#### 📦 Asset Schema (`packages/db/src/schema/asset.ts`)
*   **`asset`**: Media assets uploaded to spaces (name, type `image|video|audio`, src URL, duration, size, dimensions, spaceId, userId).
*   **`assetTranscript`**: Text segments extracted from media assets (assetId, spaceId, segments JSON).
*   **`assetVisualTimeline`**: Scene descriptions from media assets (assetId, spaceId, scenes JSON).
*   **`assetIndexingStatus`**: Pipeline statuses (status `'pending'|'processing'|'completed'|'failed'`, progress, stage, error).
*   **`clipTranscript`**: Transcripts of individual cut clips.
*   **`upload`**: Global user uploads.

### How to Access the DB

Always import `getDB` and the schema definitions directly from `@openvideo/db`:

```typescript
import { getDB, schema, eq, and } from "@openvideo/db";

const db = getDB();

// Querying projects
const userProjects = await db.query.project.findMany({
  where: eq(schema.project.userId, "user-id-here"),
});
```

---

## 🔌 API & Communication (`@openvideo/api`)

Communication between client and backend is handled via tRPC.

### Routers List
All endpoints live in `@openvideo/api/src/routers/` and are merged into `appRouter` in `root.ts`:

1.  **`project`**: `list`, `getById`, `create`, `update`, `delete`, `linkToSpace`
2.  **`space`**: `list`, `getById`, `create`, `update`, `delete`, `getDirectorSession`
3.  **`asset`**: `upload`, `list`, `delete`, `getUploadUrl`
4.  **`chat`**: `send` (asymmetric embedding generation + pgvector similarity search + Gemini 2.5 response)
5.  **`indexing`**: `triggerBulkIndex`, `getBulkStatus`, `getIndexedAssets`
6.  **`token`**: `create`, `list`, `update`, `delete`

### Key Conventions
*   **Authentication**: Use `protectedProcedure` for all user-authenticated routes. It populates `ctx.user` and `ctx.session`.
*   **Context**: Built-in context (`createTRPCContext`) extracts sessions via Better Auth headers/cookies.

---

## 🤖 Background Worker System (`apps/director`)

NestJS operates purely as a background processor. Let's look at the key technologies:

1.  **BullMQ (Redis Queues)**:
    *   Next.js/tRPC pushes a message to a queue (e.g. `index-project` inside `indexingRouter`).
    *   NestJS listens to the queue via module processors:
        ```typescript
        @Processor("index-project")
        export class ProjectIndexConsumer extends WorkerHost {
          async process(job: Job<any>) { ... }
        }
        ```
2.  **Trigger.dev (v3)**:
    *   Handles CPU/Memory-intensive operations in isolated serverless environments.
    *   Trigger configurations are defined in `apps/director/trigger.config.ts`.
    *   Task scripts are located in `apps/director/trigger/`.
    *   Invoked from Next.js via tRPC using:
        ```typescript
        import { tasks } from "@trigger.dev/sdk/v3";
        const handle = await tasks.trigger("index-asset", { assetId });
        ```
3.  **Real-Time Broadcast (Socket.io)**:
    *   Background consumers send progress updates to users.
    *   NestJS leverages a Redis WebSocket Adapter to scale horizontally.
    *   Services inject `BroadcastGateway` to emit to specific user/room channels:
        ```typescript
        this.broadcastGateway.server.to(`space:${spaceId}`).emit("indexing:progress", { progress });
        ```

---

## 🛠️ Step-by-Step Developer Playbooks

### Playbook 1: Adding a New DB Field or Table

1.  **Define Schema**: Open the relevant file in `packages/db/src/schema/` (e.g., `project.ts`). Add your table or column:
    ```typescript
    export const project = pgTable("project", {
      // existing fields...
      category: text("category"), // new field
    });
    ```
2.  **Export Schema**: Verify it is exported in `packages/db/src/schema/index.ts` and `packages/db/src/index.ts`.
3.  **Generate Migration**: In the terminal, run the drizzle migration generator (e.g., `pnpm --filter @openvideo/db db:generate` or `npx drizzle-kit generate`).
4.  **Apply Migration**: Run migration scripts to apply changes to your PostgreSQL instance.

### Playbook 2: Creating a New tRPC Procedure

1.  **Create/Edit Router**: Add the procedure inside `packages/api/src/routers/`:
    ```typescript
    export const myRouter = router({
      myProcedure: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
          // ctx.user is available
          return { success: true };
        }),
    });
    ```
2.  **Link to Root Router**: If creating a new router file, import and merge it in `packages/api/src/root.ts`:
    ```typescript
    export const appRouter = router({
      project: projectRouter,
      myRouter: myRouter, // add here
    });
    ```
3.  **Consume in Next.js Client**:
    ```typescript
    import { trpc } from "@/lib/trpc";
    
    const { mutate } = trpc.myRouter.myProcedure.useMutation();
    mutate({ id: "123" });
    ```

---

## 🌐 Environment Variables Reference

Ensure these are properly set in your local `.env` files:

### Next.js Client (`apps/app/.env`)
```bash
# Database & Auth
DATABASE_URL="postgresql://user:pass@localhost:5432/openvideo"
BETTER_AUTH_URL="http://localhost:3000"

# Background Service Connection
DIRECTOR_URL="http://localhost:4000"
NEXT_PUBLIC_DIRECTOR_WS_URL="ws://localhost:4000"

# External APIs
ELEVENLABS_API_KEY="sk_xxx"
DEEPGRAM_API_KEY="xxx"
GOOGLE_API_KEY="xxx" # For Gemini chat / indexing
RESEND_KEY="re_xxx"  # Magic link transactional emails

# R2 Assets Storage
R2_ACCOUNT_ID="xxx"
R2_ACCESS_KEY_ID="xxx"
R2_SECRET_ACCESS_KEY="xxx"
R2_BUCKET_NAME="openvideo-assets"
R2_PUBLIC_DOMAIN="https://cdn.openvideo.io"
```

### NestJS Worker (`apps/director/.env`)
```bash
PORT=4000
NODE_ENV=development

# Database & Auth (shared)
DATABASE_URL="postgresql://user:pass@localhost:5432/openvideo"
JWT_SECRET="your-better-auth-secret"

# Queuing & Realtime
REDIS_URL="redis://localhost:6379"

# Trigger.dev
TRIGGER_SECRET_KEY="tr_dev_xxx"

# AI & APIs
GOOGLE_API_KEY="xxx"
ELEVENLABS_API_KEY="xxx"

# Cloudflare R2 Storage (shared)
R2_ACCOUNT_ID="xxx"
R2_ACCESS_KEY_ID="xxx"
R2_SECRET_ACCESS_KEY="xxx"
R2_BUCKET_NAME="openvideo-assets"
R2_PUBLIC_URL="https://pub-xxx.r2.dev"
```

---

## 🚀 Dev Commands & Ports

| Command | Workspace Location | Description |
| :--- | :--- | :--- |
| `pnpm dev` | Root | Run all apps (`apps/app` and `apps/director`) in dev mode |
| `pnpm build` | Root | Build all packages and applications |
| `pnpm check-types` | Root | Run TypeScript validation on all packages and apps |
| `pnpm db:generate` | `packages/db` | Generate schema migrations |
| `pnpm db:migrate` | `packages/db` | Apply database migrations |

### Default Ports
*   **`3000`**: Next.js App
*   **`4000`**: NestJS Director Service
*   **`6379`**: Redis Server
*   **`5432`**: PostgreSQL Database
