/**
 * ========================================================================
 * BOSS CONFIGURATION
 * ========================================================================
 * Configuration for boss enemy mechanics including summoning, splitting,
 * knockback, and special attacks.
 */

export const bossConfig = {
  /**
   * ========================================================================
   * BOSS ZOMBIE (GRAVE TYRANT)
   * ========================================================================
   */

  /**
   * How often the boss zombie summons minions (in seconds)
   */
  BOSS_ZOMBIE_SUMMON_INTERVAL: 8,

  /**
   * Number of minions spawned per summon
   */
  BOSS_ZOMBIE_SUMMON_BATCH_SIZE: 3,

  /**
   * Maximum number of active summoned minions at once
   */
  BOSS_ZOMBIE_MAX_SUMMONED_MINIONS: 10,

  /**
   * Minimum spawn radius for minions (in pixels)
   */
  BOSS_ZOMBIE_MIN_SUMMON_RADIUS: 12,

  /**
   * Maximum spawn radius for minions (in pixels)
   */
  BOSS_ZOMBIE_SUMMON_RADIUS: 96,

  /**
   * ========================================================================
   * SPLITTER BOSS
   * ========================================================================
   */

  /**
   * Health percentage thresholds at which the splitter boss splits
   */
  SPLITTER_BOSS_SPLIT_THRESHOLDS: [0.5] as readonly number[],

  /**
   * Minimum spawn radius for split offspring (in pixels)
   */
  SPLITTER_BOSS_MIN_SPLIT_RADIUS: 32,

  /**
   * Maximum spawn radius for split offspring (in pixels)
   */
  SPLITTER_BOSS_MAX_SPLIT_RADIUS: 64,

  /**
   * Minimum distance between newly spawned splitters (in pixels)
   */
  SPLITTER_BOSS_MIN_DISTANCE_BETWEEN: 32,

  /**
   * Maximum attempts to find valid spawn position for split offspring
   */
  SPLITTER_BOSS_SPAWN_ATTEMPTS: 20,

  /**
   * Fallback spawn distance when no valid position found (in pixels)
   */
  SPLITTER_BOSS_FALLBACK_SPAWN_DISTANCE: 40,

  /**
   * ========================================================================
   * BIG ZOMBIE
   * ========================================================================
   */

  /**
   * Knockback force applied to players when hit (in pixels/second)
   */
  BIG_ZOMBIE_KNOCKBACK_FORCE: 600,

  /**
   * ========================================================================
   * EXPLODING ZOMBIE
   * ========================================================================
   */

  /**
   * Base explosion damage dealt by exploding zombie
   */
  EXPLODING_ZOMBIE_EXPLOSION_DAMAGE: 5,

  /**
   * Collision offset threshold for exploding zombie (in pixels)
   */
  EXPLODING_ZOMBIE_COLLISION_THRESHOLD: 4,

  /**
   * ========================================================================
   * CHARGING TYRANT
   * ========================================================================
   */

  /**
   * Time to detect wall collision while charging (in seconds)
   */
  CHARGING_TYRANT_WALL_COLLISION_DETECTION_TIME: 0.1,
} as const;

export type BossConfig = typeof bossConfig;
