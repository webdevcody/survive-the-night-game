import { eq, sql } from "drizzle-orm";
import { database } from "~/db";
import { userStats, user, type UserStats } from "~/db/schema";
import { randomUUID } from "crypto";

/**
 * Get user stats by user ID, creating if doesn't exist
 */
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
export async function incrementZombieKills(
  userId: string,
  count: number = 1
): Promise<UserStats> {
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
    wavesCompleted: number;
    maxWave: number;
  }>
> {
  const results = await database
    .select({
      playerName: user.name,
      playerImage: user.image,
      zombieKills: userStats.zombieKills,
      wavesCompleted: userStats.wavesCompleted,
      maxWave: userStats.maxWave,
    })
    .from(userStats)
    .innerJoin(user, eq(userStats.userId, user.id))
    .orderBy(sql`${userStats.maxWave} DESC`)
    .limit(limit);

  return results.map((row, index) => ({
    rank: index + 1,
    playerName: row.playerName,
    playerImage: row.playerImage,
    zombieKills: row.zombieKills,
    wavesCompleted: row.wavesCompleted,
    maxWave: row.maxWave,
  }));
}

/**
 * Update player stats (kills, waves) in a single operation
 * Uses upsert pattern with conditional max_wave update
 */
export async function updatePlayerStats(
  userId: string,
  stats: {
    zombieKills: number;
    wavesCompleted: number;
    maxWave: number;
  }
): Promise<UserStats> {
  // Use upsert pattern - insert if not exists, update if exists
  const [result] = await database
    .insert(userStats)
    .values({
      id: randomUUID(),
      userId,
      zombieKills: stats.zombieKills,
      wavesCompleted: stats.wavesCompleted,
      maxWave: stats.maxWave,
    })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: {
        zombieKills: sql`${userStats.zombieKills} + ${stats.zombieKills}`,
        wavesCompleted: sql`${userStats.wavesCompleted} + ${stats.wavesCompleted}`,
        maxWave: sql`GREATEST(${userStats.maxWave}, ${stats.maxWave})`,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}
