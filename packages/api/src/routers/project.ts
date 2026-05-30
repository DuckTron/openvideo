import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDB, project, space } from "@openvideo/db";
import { router, protectedProcedure } from "../trpc.js";

const db = getDB();

export const projectRouter = router({
  // List all projects for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const projects = await db.query.project.findMany({
      where: eq(project.userId, ctx.user.id),
      orderBy: desc(project.updatedAt),
    });
    return projects;
  }),

  // Get a single project by ID
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const result = await db.query.project.findFirst({
      where: and(eq(project.id, input.id), eq(project.userId, ctx.user.id)),
    });
    if (!result) {
      throw new Error("Project not found");
    }
    return result;
  }),

  // Create a new project
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        width: z.number().default(1080),
        height: z.number().default(1920),
        fps: z.number().default(30),
        data: z.object({
          tracks: z.array(z.any()),
          clips: z.record(z.string(), z.any()),
          settings: z.any().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const newProject = await db
        .insert(project)
        .values({
          id,
          name: input.name,
          description: input.description,
          userId: ctx.user.id,
          width: input.width,
          height: input.height,
          fps: input.fps,
          data: input.data,
        })
        .returning();
      return newProject[0];
    }),

  // Update a project
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        thumbnail: z.string().optional(),
        data: z
          .object({
            tracks: z.array(z.any()).optional(),
            clips: z.record(z.string(), z.any()).optional(),
            settings: z.any().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      // Build update object with only provided fields
      const updateData: any = {
        updatedAt: new Date(),
      };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.thumbnail !== undefined) updateData.thumbnail = updates.thumbnail;
      if (updates.data !== undefined) updateData.data = updates.data;

      const result = await db
        .update(project)
        .set(updateData)
        .where(and(eq(project.id, id), eq(project.userId, ctx.user.id)))
        .returning();

      if (result.length === 0) {
        throw new Error("Project not found or unauthorized");
      }
      return result[0];
    }),

  // Delete a project
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await db
        .delete(project)
        .where(and(eq(project.id, input.id), eq(project.userId, ctx.user.id)))
        .returning();

      if (result.length === 0) {
        throw new Error("Project not found or unauthorized");
      }
      return { success: true };
    }),

  // Link project to space (for director collaboration)
  linkToSpace: protectedProcedure
    .input(z.object({ projectId: z.string(), spaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify space exists and belongs to user
      const spaceResult = await db.query.space.findFirst({
        where: and(eq(space.id, input.spaceId), eq(space.userId, ctx.user.id)),
      });

      if (!spaceResult) {
        throw new Error("Space not found or unauthorized");
      }

      const result = await db
        .update(project)
        .set({
          spaceId: input.spaceId,
          updatedAt: new Date(),
        })
        .where(and(eq(project.id, input.projectId), eq(project.userId, ctx.user.id)))
        .returning();

      if (result.length === 0) {
        throw new Error("Project not found or unauthorized");
      }
      return result[0];
    }),
});
