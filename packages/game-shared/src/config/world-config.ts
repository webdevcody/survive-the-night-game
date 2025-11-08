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
} as const;

export type WorldConfig = typeof worldConfig;
