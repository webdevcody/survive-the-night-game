import { eq, gt, sql } from "drizzle-orm";
import { database } from "~/db";
import { gameServer } from "~/db/schema";

/** Rows with last_seen older than this are omitted from the public server list. */
export const GAME_SERVER_REGISTRY_FRESH_SQL = sql`now() - interval '90 seconds'`;

export type UpsertGameServerInput = {
  id: number;
  publicWsUrl: string;
  displayName?: string | null;
  listenPort?: number | null;
};

export async function upsertGameServerRegistration(input: UpsertGameServerInput): Promise<void> {
  const now = new Date();
  await database
    .insert(gameServer)
    .values({
      id: input.id,
      publicWsUrl: input.publicWsUrl,
      displayName: input.displayName ?? null,
      listenPort: input.listenPort ?? null,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: gameServer.id,
      set: {
        publicWsUrl: input.publicWsUrl,
        displayName: input.displayName ?? null,
        listenPort: input.listenPort ?? null,
        lastSeenAt: now,
        updatedAt: now,
      },
    });
}

export async function touchGameServerRegistryHeartbeat(id: number): Promise<boolean> {
  const now = new Date();
  const [row] = await database
    .update(gameServer)
    .set({ lastSeenAt: now, updatedAt: now })
    .where(eq(gameServer.id, id))
    .returning({ id: gameServer.id });
  return row !== undefined;
}

export type PublicGameServerDto = {
  id: number;
  displayName: string | null;
  publicWsUrl: string;
  lastSeenAt: string;
};

function isUndefinedTableError(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string }; message?: string };
  if (e?.code === "42P01" || e?.cause?.code === "42P01") {
    return true;
  }
  const msg = typeof e?.message === "string" ? e.message : "";
  return msg.includes("game_server") && msg.includes("does not exist");
}

export async function listFreshGameServersForPublic(): Promise<PublicGameServerDto[]> {
  try {
    const rows = await database
      .select({
        id: gameServer.id,
        displayName: gameServer.displayName,
        publicWsUrl: gameServer.publicWsUrl,
        lastSeenAt: gameServer.lastSeenAt,
      })
      .from(gameServer)
      .where(gt(gameServer.lastSeenAt, GAME_SERVER_REGISTRY_FRESH_SQL));

    return rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      publicWsUrl: r.publicWsUrl,
      lastSeenAt: r.lastSeenAt.toISOString(),
    }));
  } catch (error) {
    if (isUndefinedTableError(error)) {
      console.warn(
        "[game-server-registry] table game_server is missing. Run: cd packages/website && npm run db:migrate",
      );
      return [];
    }
    throw error;
  }
}
