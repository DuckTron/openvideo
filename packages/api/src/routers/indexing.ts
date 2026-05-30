import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDB, asset, assetIndexingStatus, space } from "@openvideo/db";
import { router, protectedProcedure } from "../trpc.js";
import { tasks } from "@trigger.dev/sdk/v3";
import { Queue } from "bullmq";

const db = getDB();

// Initialize BullMQ Queue for project indexing
let projectIndexQueue: Queue | null = null;
const redisUrl = process.env.REDIS_URL;

if (redisUrl) {
  const url = new URL(redisUrl);
  const isTls = url.protocol === "rediss:";
  projectIndexQueue = new Queue("index-project", {
    connection: {
      host: url.hostname,
      port: Number(url.port) || (isTls ? 6380 : 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      tls: isTls ? {} : undefined,
    },
  });
} else {
  projectIndexQueue = new Queue("index-project", {
    connection: {
      host: "localhost",
      port: 6379,
    },
  });
}

export const indexingRouter = router({
  // Trigger bulk indexing for all assets in a space
  triggerBulkIndex: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Verify space access
      const spaceExists = await db.query.space.findFirst({
        where: and(eq(space.id, input.spaceId), eq(space.userId, ctx.user.id)),
      });

      if (!spaceExists) {
        throw new Error("Space not found or unauthorized");
      }

      // 2. Get all assets in the space
      const assets = await db.query.asset.findMany({
        where: eq(asset.spaceId, input.spaceId),
      });

      const jobIds: string[] = [];

      // 3. Reset status and trigger Trigger.dev job for each asset
      for (const a of assets) {
        await db
          .insert(assetIndexingStatus)
          .values({
            id: crypto.randomUUID(),
            assetId: a.id,
            spaceId: input.spaceId,
            status: "pending",
          })
          .onConflictDoUpdate({
            target: [assetIndexingStatus.assetId],
            set: {
              status: "pending",
              progress: 0,
              stage: "queued",
              error: null,
              updatedAt: new Date(),
            },
          });

        const handle = await tasks.trigger("index-asset", {
          spaceId: input.spaceId,
          assetId: a.id,
        });
        jobIds.push(handle.id);
      }

      // 4. Trigger project-level structural indexing in BullMQ
      if (projectIndexQueue) {
        await projectIndexQueue.add("index", { spaceId: input.spaceId });
      }

      return {
        spaceId: input.spaceId,
        queued: assets.length,
        jobIds,
      };
    }),

  // Get overall indexing progress status for the space
  getBulkStatus: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify space access
      const spaceExists = await db.query.space.findFirst({
        where: and(eq(space.id, input.spaceId), eq(space.userId, ctx.user.id)),
      });

      if (!spaceExists) {
        throw new Error("Space not found or unauthorized");
      }

      // Get count summaries
      const statuses = await db.query.assetIndexingStatus.findMany({
        where: eq(assetIndexingStatus.spaceId, input.spaceId),
      });

      const total = statuses.length;
      const pending = statuses.filter((s) => s.status === "pending").length;
      const processing = statuses.filter((s) => s.status === "processing").length;
      const completed = statuses.filter((s) => s.status === "completed").length;
      const failed = statuses.filter((s) => s.status === "failed").length;

      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        spaceId: input.spaceId,
        summary: {
          total,
          pending,
          processing,
          completed,
          failed,
        },
        progress,
      };
    }),

  // Get list of assets with their indexing status
  getIndexedAssets: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify space access
      const spaceExists = await db.query.space.findFirst({
        where: and(eq(space.id, input.spaceId), eq(space.userId, ctx.user.id)),
      });

      if (!spaceExists) {
        throw new Error("Space not found or unauthorized");
      }

      const assets = await db.query.asset.findMany({
        where: eq(asset.spaceId, input.spaceId),
        with: {
          indexingStatus: true,
        },
      });

      return {
        spaceId: input.spaceId,
        assets: assets.map((a) => {
          const status = a.indexingStatus[0];
          return {
            id: a.id,
            name: a.name,
            type: a.type,
            indexing: status
              ? {
                  status: status.status,
                  progress: status.progress || 0,
                  stage: status.stage,
                  error: status.error,
                }
              : {
                  status: "pending",
                  progress: 0,
                  stage: null,
                  error: null,
                },
          };
        }),
      };
    }),
});
