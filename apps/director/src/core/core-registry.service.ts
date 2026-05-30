import { getDB, schema, eq } from "@openvideo/db";
const db = getDB();

import { Injectable, Logger } from "@nestjs/common";
import { ServerCore } from "./server-core";
import { IProject } from "@openvideo/core";

@Injectable()
export class CoreRegistryService {
  private cores = new Map<string, ServerCore>();
  private readonly logger = new Logger(CoreRegistryService.name);

  async get(projectId: string): Promise<ServerCore> {
    if (this.cores.has(projectId)) {
      return this.cores.get(projectId)!;
    }

    this.logger.log(`Loading project ${projectId} from database into memory`);

    // Try loading space snapshot (data column stores IProject snapshot)
    const [spaceRow] = await db
      .select()
      .from(schema.space)
      .where(eq(schema.space.id, projectId))
      .limit(1);

    let initialState: any = spaceRow?.data || null;

    // Fallback: load from project table
    if (!initialState) {
      const [projectRow] = await db
        .select()
        .from(schema.project)
        .where(eq(schema.project.id, projectId))
        .limit(1);

      if (projectRow) {
        initialState = {
          settings: {
            width: projectRow.width,
            height: projectRow.height,
            fps: projectRow.fps,
            duration: 30_000_000,
          },
          tracks: projectRow.data?.tracks || [],
          clips: projectRow.data?.clips || {},
        };
      }
    }

    const core = new ServerCore(initialState || undefined);
    this.cores.set(projectId, core);

    return core;
  }

  async persist(projectId: string): Promise<void> {
    const core = this.cores.get(projectId);
    if (!core) {
      this.logger.warn(`Cannot persist project ${projectId}: not found in memory`);
      return;
    }

    const snapshot = core.getSnapshot();

    await db
      .update(schema.space)
      .set({ data: snapshot, updatedAt: new Date() })
      .where(eq(schema.space.id, projectId));

    this.logger.log(`Persisted project ${projectId} snapshot to database`);
  }

  unload(projectId: string) {
    const core = this.cores.get(projectId);
    if (core) {
      core.destroy();
      this.cores.delete(projectId);
      this.logger.log(`Unloaded project ${projectId} from memory`);
    }
  }
}
