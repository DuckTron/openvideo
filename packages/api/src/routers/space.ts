import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDB, space, directorSession } from "@openvideo/db";
import { router, protectedProcedure } from "../trpc.js";

const db = getDB();

export const spaceRouter = router({
  // List all spaces for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const spaces = await db.query.space.findMany({
      where: eq(space.userId, ctx.user.id),
      orderBy: desc(space.updatedAt),
    });
    return spaces;
  }),

  // Get a single space by ID
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const result = await db.query.space.findFirst({
      where: and(eq(space.id, input.id), eq(space.userId, ctx.user.id)),
      with: {
        directorSessions: true,
      },
    });
    if (!result) {
      throw new Error("Space not found");
    }
    return result;
  }),

  // Create a new space
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        data: z.any().default({}),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const newSpace = await db
        .insert(space)
        .values({
          id,
          name: input.name,
          userId: ctx.user.id,
          data: input.data,
        })
        .returning();
      return newSpace[0];
    }),

  // Update space data
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        data: z.any().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const updateData: Partial<typeof space.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.data !== undefined) updateData.data = updates.data;

      const result = await db
        .update(space)
        .set(updateData)
        .where(and(eq(space.id, id), eq(space.userId, ctx.user.id)))
        .returning();

      if (result.length === 0) {
        throw new Error("Space not found or unauthorized");
      }
      return result[0];
    }),

  // Delete a space
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await db
        .delete(space)
        .where(and(eq(space.id, input.id), eq(space.userId, ctx.user.id)))
        .returning();

      if (result.length === 0) {
        throw new Error("Space not found or unauthorized");
      }
      return { success: true };
    }),

  // Get or create director session for a space
  getDirectorSession: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify space access
      const spaceResult = await db.query.space.findFirst({
        where: and(eq(space.id, input.spaceId), eq(space.userId, ctx.user.id)),
      });

      if (!spaceResult) {
        throw new Error("Space not found or unauthorized");
      }

      // Try to find existing session
      let session = await db.query.directorSession.findFirst({
        where: and(
          eq(directorSession.spaceId, input.spaceId),
          eq(directorSession.userId, ctx.user.id),
        ),
      });

      // Create if doesn't exist
      if (!session) {
        const newSession = await db
          .insert(directorSession)
          .values({
            id: crypto.randomUUID(),
            spaceId: input.spaceId,
            userId: ctx.user.id,
            historyJson: [],
          })
          .returning();
        session = newSession[0];
      }

      return session;
    }),
});
