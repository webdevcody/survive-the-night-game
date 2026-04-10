import { eq, sql } from "drizzle-orm";
import { database } from "~/db";
import { userStats, user, type UserStats } from "~/db/schema";
import { randomUUID } from "crypto";
import {
  normalizeCharacterAllocations,
  normalizeSkillAllocations,
  validateCharacterAllocations,
  validateSkillAllocations,
} from "@survive-the-night/game-shared/util/progression-allocation";
import { XP_PER_ZOMBIE_KILL } from "@survive-the-night/game-shared/util/experience-level";
import type { CharacterAllocations } from "@survive-the-night/game-shared/util/character-stats";
import type { SkillAllocations } from "@survive-the-night/game-shared/util/skill-tree";
import type { PlayerQuestStatePayload } from "@survive-the-night/game-shared/quests/player-quest-state";
import {
  coercePlayerInventoryPersistedPayload,
  type PlayerInventoryPersistedPayload,
} from "@survive-the-night/game-shared/util/persisted-inventory-payload";

/**
 * Get user stats by user ID, creating if doesn't exist
 */
/**
 * Total XP for game join hydration. Coerces DB/JSON types and, if experience is still 0 but
 * zombie kills were recorded (e.g. legacy rows or failed add-experience calls), derives XP from kills.
 */
export function resolveHydrationExperience(stats: UserStats): number {
  const raw = stats.experience as unknown;
  let xp =
    typeof raw === "number" && Number.isFinite(raw)
      ? Math.floor(raw)
      : typeof raw === "string" && raw.trim() !== ""
        ? Math.max(0, Math.floor(Number(raw)))
        : 0;

  const rawKills = stats.zombieKills as unknown;
  const kills =
    typeof rawKills === "number" && Number.isFinite(rawKills)
      ? Math.floor(rawKills)
      : typeof rawKills === "string" && rawKills.trim() !== ""
        ? Math.max(0, Math.floor(Number(rawKills)))
        : 0;

  if (xp <= 0 && kills > 0) {
    return kills * XP_PER_ZOMBIE_KILL;
  }
  return Math.max(0, xp);
}

/**
 * Persist last open-world tile indices when the player disconnects (game server).
 */
/**
 * Game server disconnect: persist last tile, quest journal, and live character stats (includes quest rewards).
 * Character map is normalized and clamped only — no XP budget validation (trusted game-server path).
 */
export async function persistGameServerDisconnectSnapshot(
  userId: string,
  snapshot: {
    lastTileX: number;
    lastTileY: number;
    questProgress: PlayerQuestStatePayload;
    characterAllocations: Record<string, number>;
    skillAllocations?: Record<string, number>;
    savedInventory?: unknown;
    /** When set (both numbers), persist bind; when both null, clear bind; when omitted, leave DB unchanged. */
    respawnTileX?: number | null;
    respawnTileY?: number | null;
  },
): Promise<UserStats> {
  await getOrCreateUserStats(userId);
  const characterAllocations = normalizeCharacterAllocations(snapshot.characterAllocations) as Record<
    string,
    number
  >;

  const skillAllocations =
    snapshot.skillAllocations !== undefined
      ? (normalizeSkillAllocations(snapshot.skillAllocations) as Record<string, number>)
      : undefined;

  const savedInventory =
    snapshot.savedInventory !== undefined
      ? coercePlayerInventoryPersistedPayload(snapshot.savedInventory)
      : undefined;

  const baseSet: {
    lastTileX: number;
    lastTileY: number;
    questProgress: PlayerQuestStatePayload;
    characterAllocations: Record<string, number>;
    skillAllocations?: Record<string, number>;
    savedInventory?: PlayerInventoryPersistedPayload | null;
    updatedAt: Date;
  } = {
    lastTileX: Math.floor(snapshot.lastTileX),
    lastTileY: Math.floor(snapshot.lastTileY),
    questProgress: {
      active: snapshot.questProgress.active,
      completed: snapshot.questProgress.completed,
    },
    characterAllocations,
    updatedAt: new Date(),
  };

  if (skillAllocations !== undefined) {
    baseSet.skillAllocations = skillAllocations;
  }
  if (savedInventory !== undefined && savedInventory != null) {
    baseSet.savedInventory = savedInventory;
  }

  const rx = snapshot.respawnTileX;
  const ry = snapshot.respawnTileY;
  const hasRespawnUpdate = rx !== undefined && ry !== undefined;

  const [updated] = await database
    .update(userStats)
    .set(
      hasRespawnUpdate
        ? {
            ...baseSet,
            respawnTileX:
              rx !== null && ry !== null ? Math.floor(rx) : null,
            respawnTileY:
              rx !== null && ry !== null ? Math.floor(ry) : null,
          }
        : baseSet,
    )
    .where(eq(userStats.userId, userId))
    .returning();
  return updated!;
}

/**
 * Persist campsite-fire respawn bind (game server → website).
 */
export async function updateRespawnBind(
  userId: string,
  respawnTileX: number,
  respawnTileY: number,
): Promise<UserStats> {
  const tx = Math.floor(respawnTileX);
  const ty = Math.floor(respawnTileY);
  await getOrCreateUserStats(userId);
  const [updated] = await database
    .update(userStats)
    .set({
      respawnTileX: tx,
      respawnTileY: ty,
      updatedAt: new Date(),
    })
    .where(eq(userStats.userId, userId))
    .returning();
  return updated!;
}

/**
 * Clear persisted respawn bind (e.g. tile became invalid).
 */
export async function clearRespawnBind(userId: string): Promise<UserStats> {
  await getOrCreateUserStats(userId);
  const [updated] = await database
    .update(userStats)
    .set({
      respawnTileX: null,
      respawnTileY: null,
      updatedAt: new Date(),
    })
    .where(eq(userStats.userId, userId))
    .returning();
  return updated!;
}

/**
 * Persist quest journal only (incremental updates from game server). Does not touch tiles or allocations.
 */
export async function updateQuestProgressOnly(
  userId: string,
  questProgress: PlayerQuestStatePayload,
): Promise<UserStats> {
  await getOrCreateUserStats(userId);
  const [updated] = await database
    .update(userStats)
    .set({
      questProgress: {
        active: { ...questProgress.active },
        completed: [...questProgress.completed],
      },
      updatedAt: new Date(),
    })
    .where(eq(userStats.userId, userId))
    .returning();
  return updated!;
}

/**
 * Last known tile, optional character stats, optional respawn bind. Does not modify quest_progress.
 */
export async function persistOpenWorldSessionFields(
  userId: string,
  data: {
    lastTileX: number;
    lastTileY: number;
    characterAllocations?: Record<string, number>;
    skillAllocations?: Record<string, number>;
    savedInventory?: unknown;
    respawnTileX?: number | null;
    respawnTileY?: number | null;
  },
): Promise<UserStats> {
  await getOrCreateUserStats(userId);

  const setFields: {
    lastTileX: number;
    lastTileY: number;
    updatedAt: Date;
    characterAllocations?: Record<string, number>;
    skillAllocations?: Record<string, number>;
    savedInventory?: PlayerInventoryPersistedPayload | null;
    respawnTileX?: number | null;
    respawnTileY?: number | null;
  } = {
    lastTileX: Math.floor(data.lastTileX),
    lastTileY: Math.floor(data.lastTileY),
    updatedAt: new Date(),
  };

  if (data.characterAllocations !== undefined) {
    setFields.characterAllocations = normalizeCharacterAllocations(
      data.characterAllocations,
    ) as Record<string, number>;
  }

  if (data.skillAllocations !== undefined) {
    setFields.skillAllocations = normalizeSkillAllocations(data.skillAllocations) as Record<
      string,
      number
    >;
  }

  if (data.savedInventory !== undefined) {
    const coercedInv = coercePlayerInventoryPersistedPayload(data.savedInventory);
    if (coercedInv != null) {
      setFields.savedInventory = coercedInv;
    }
  }

  const rx = data.respawnTileX;
  const ry = data.respawnTileY;
  if (rx !== undefined && ry !== undefined) {
    setFields.respawnTileX = rx !== null && ry !== null ? Math.floor(rx) : null;
    setFields.respawnTileY = rx !== null && ry !== null ? Math.floor(ry) : null;
  }

  const [updated] = await database
    .update(userStats)
    .set(setFields)
    .where(eq(userStats.userId, userId))
    .returning();
  return updated!;
}

export async function updateLastTilePosition(
  userId: string,
  lastTileX: number,
  lastTileY: number,
): Promise<UserStats> {
  const tx = Math.floor(lastTileX);
  const ty = Math.floor(lastTileY);
  await getOrCreateUserStats(userId);
  const [updated] = await database
    .update(userStats)
    .set({
      lastTileX: tx,
      lastTileY: ty,
      updatedAt: new Date(),
    })
    .where(eq(userStats.userId, userId))
    .returning();
  return updated!;
}

export async function getOrCreateUserStats(userId: string): Promise<UserStats> {
  const [existing] = await database
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await database
    .insert(userStats)
    .values({
      id: randomUUID(),
      userId,
      zombieKills: 0,
    })
    .returning();

  return created;
}

/**
 * Increment zombie kills for a user
 */
export async function incrementZombieKills(userId: string, count: number = 1): Promise<UserStats> {
  // Use upsert pattern - insert if not exists, update if exists
  const [result] = await database
    .insert(userStats)
    .values({
      id: randomUUID(),
      userId,
      zombieKills: count,
    })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: {
        zombieKills: sql`${userStats.zombieKills} + ${count}`,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}

/**
 * Get user stats by user ID
 */
export async function getUserStats(userId: string): Promise<UserStats | null> {
  const [result] = await database
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  return result || null;
}

/**
 * Get leaderboard data with user names
 * Only returns name, not email to avoid data leakage
 */
export async function getLeaderboardStats(limit: number = 100): Promise<
  Array<{
    rank: number;
    playerName: string;
    playerImage: string | null;
    zombieKills: number;
  }>
> {
  const results = await database
    .select({
      playerName: user.displayName,
      playerImage: user.image,
      zombieKills: userStats.zombieKills,
    })
    .from(userStats)
    .innerJoin(user, eq(userStats.userId, user.id))
    .orderBy(sql`${userStats.zombieKills} DESC`)
    .limit(limit);

  return results.map((row, index) => ({
    rank: index + 1,
    playerName: row.playerName,
    playerImage: row.playerImage,
    zombieKills: row.zombieKills,
  }));
}

/**
 * Add experience points for a user (e.g. per zombie kill from game server).
 */
export async function addExperience(userId: string, delta: number): Promise<UserStats> {
  const safeDelta = Math.max(0, Math.floor(delta));
  if (safeDelta === 0) {
    return getOrCreateUserStats(userId);
  }

  const [result] = await database
    .insert(userStats)
    .values({
      id: randomUUID(),
      userId,
      zombieKills: 0,
      experience: safeDelta,
    })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: {
        experience: sql`${userStats.experience} + ${safeDelta}`,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}

/**
 * Update player stats (kills) in a single operation
 */
export async function updatePlayerStats(
  userId: string,
  stats: {
    zombieKills: number;
  },
): Promise<UserStats> {
  const [result] = await database
    .insert(userStats)
    .values({
      id: randomUUID(),
      userId,
      zombieKills: stats.zombieKills,
    })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: {
        zombieKills: sql`${userStats.zombieKills} + ${stats.zombieKills}`,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}

/**
 * Replace skill allocations after validation against user's experience level.
 */
export async function setSkillAllocations(
  userId: string,
  raw: unknown,
): Promise<{ ok: true; stats: UserStats } | { ok: false; error: string }> {
  const stats = await getOrCreateUserStats(userId);
  const allocations = normalizeSkillAllocations(raw) as SkillAllocations;
  const err = validateSkillAllocations(allocations, stats.experience);
  if (err) {
    return { ok: false, error: JSON.stringify(err) };
  }
  const [updated] = await database
    .update(userStats)
    .set({
      skillAllocations: allocations as Record<string, number>,
      updatedAt: new Date(),
    })
    .where(eq(userStats.userId, userId))
    .returning();
  return { ok: true, stats: updated! };
}

/**
 * Replace character stat allocations after validation against user's experience level.
 */
export async function setCharacterAllocations(
  userId: string,
  raw: unknown,
): Promise<{ ok: true; stats: UserStats } | { ok: false; error: string }> {
  const stats = await getOrCreateUserStats(userId);
  const allocations = normalizeCharacterAllocations(raw) as CharacterAllocations;
  const err = validateCharacterAllocations(allocations, stats.experience);
  if (err) {
    return { ok: false, error: JSON.stringify(err) };
  }
  const [updated] = await database
    .update(userStats)
    .set({
      characterAllocations: allocations as Record<string, number>,
      updatedAt: new Date(),
    })
    .where(eq(userStats.userId, userId))
    .returning();
  return { ok: true, stats: updated! };
}
