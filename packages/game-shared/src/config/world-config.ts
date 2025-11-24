/**
 * ========================================================================
 * WORLD CONFIGURATION
 * ========================================================================
 * World generation, tiles, and building settings
 */

export const worldConfig = {
  /**
   * Size of each tile in pixels
   */
  TILE_SIZE: 16,

  /**
   * Maximum health for walls and structures
   */
  WALL_MAX_HEALTH: 10,
  WALL_LEVEL_2_MAX_HEALTH: 20,
  WALL_LEVEL_3_MAX_HEALTH: 30,

  CRATE_HEALTH: 3,

  /**
   * Maximum distance (in pixels) a player can place structures from their position
   */
  MAX_PLACEMENT_RANGE: 100,

  /**
   * Sentry gun configuration
   */
  SENTRY_GUN_MAX_HEALTH: 2,
  SENTRY_GUN_FIRE_COOLDOWN: 3000, // milliseconds
  SENTRY_GUN_DAMAGE: 1,
  SENTRY_GUN_RANGE: 140, // pixels

  /**
   * Sentry gun level 2 configuration (2x fire rate)
   */
  SENTRY_GUN_LEVEL_2_MAX_HEALTH: 4,
  SENTRY_GUN_LEVEL_2_FIRE_COOLDOWN: 1500, // milliseconds (2x faster)

  /**
   * Sentry gun level 3 configuration (3x fire rate)
   */
  SENTRY_GUN_LEVEL_3_MAX_HEALTH: 6,
  SENTRY_GUN_LEVEL_3_FIRE_COOLDOWN: 1000, // milliseconds (3x faster)

  /**
   * Spikes damage configuration
   */
  SPIKES_DAMAGE: 1,
  SPIKES_LEVEL_2_DAMAGE: 2,
  SPIKES_LEVEL_3_DAMAGE: 3,
} as const;

export type WorldConfig = typeof worldConfig;
