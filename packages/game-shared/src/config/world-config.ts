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
} as const;

export type WorldConfig = typeof worldConfig;
