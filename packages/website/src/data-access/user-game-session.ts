import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { database } from "~/db";
import { user } from "~/db/schema";

/** Heartbeat older than this is treated as stale and another server may claim the lease. */
export const GAME_SESSION_LEASE_STALE_SQL = sql`now() - interval '5 minutes'`;

export type ClaimGameSessionResult =
  | { ok: true }
  | { ok: false; reason: "active_session" | "user_not_found" };

/**
 * Atomically claim the single active game session lease for a user.
 * Succeeds when there is no lease or the previous heartbeat is stale (5+ minutes).
 */
export async function claimGameSessionLease(
  userId: string,
  sessionId: string,
  serverId: string,
): Promise<ClaimGameSessionResult> {
  const now = new Date();
  const [updated] = await database
    .update(user)
    .set({
      lastGameLoginAt: now,
      activeGameSessionId: sessionId,
      activeGameServerId: serverId,
      activeGameHeartbeatAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(user.id, userId),
               or(
          isNull(user.activeGameSessionId),
          isNull(user.activeGameHeartbeatAt),
          lt(user.activeGameHeartbeatAt, GAME_SESSION_LEASE_STALE_SQL),
        ),
      ),
    )
    .returning({ id: user.id });

  if (updated) {
    return { ok: true };
  }

  const [row] = await database
    .select({
      id: user.id,
      activeGameSessionId: user.activeGameSessionId,
      activeGameHeartbeatAt: user.activeGameHeartbeatAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) {
    return { ok: false, reason: "user_not_found" };
  }

  return { ok: false, reason: "active_session" };
}

export type HeartbeatGameSessionResult = { ok: true; stillOwner: true } | { ok: true; stillOwner: false };

/**
 * Refresh heartbeat only if this session still owns the lease.
 */
export async function heartbeatGameSessionLease(
  userId: string,
  sessionId: string,
): Promise<HeartbeatGameSessionResult> {
  const now = new Date();
  const [updated] = await database
    .update(user)
    .set({
      activeGameHeartbeatAt: now,
      updatedAt: now,
    })
    .where(and(eq(user.id, userId), eq(user.activeGameSessionId, sessionId)))
    .returning({ id: user.id });

  if (updated) {
    return { ok: true, stillOwner: true };
  }
  return { ok: true, stillOwner: false };
}

/**
 * Clear lease only if this session id still matches (idempotent for stale callers).
 */
export async function releaseGameSessionLease(userId: string, sessionId: string): Promise<void> {
  const now = new Date();
  await database
    .update(user)
    .set({
      activeGameSessionId: null,
      activeGameServerId: null,
      activeGameHeartbeatAt: null,
      updatedAt: now,
    })
    .where(and(eq(user.id, userId), eq(user.activeGameSessionId, sessionId)));
}

/**
 * Clear all active game session leases for users last tied to this game server id (crash/restart recovery).
 */
export async function clearGameSessionLeasesForServerId(serverId: string): Promise<void> {
  const now = new Date();
  await database
    .update(user)
    .set({
      activeGameSessionId: null,
      activeGameServerId: null,
      activeGameHeartbeatAt: null,
      updatedAt: now,
    })
    .where(eq(user.activeGameServerId, serverId));
}
