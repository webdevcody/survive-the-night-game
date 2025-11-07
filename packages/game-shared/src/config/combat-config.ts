/**
 * ========================================================================
 * COMBAT CONFIGURATION
 * ========================================================================
 * Combat ranges, weapon stats, and damage settings
 */

export const combatConfig = {
  /**
   * Knife melee attack range in pixels
   */
  KNIFE_ATTACK_RANGE: 26,

  /**
   * Zombie attack radius in pixels
   */
  ZOMBIE_ATTACK_RADIUS: 18,

  /**
   * Bullet visual size in pixels
   */
  BULLET_SIZE: 4,

  /**
   * Landmine explosion radius in pixels
   */
  LANDMINE_EXPLOSION_RADIUS: 32,
} as const;

export type CombatConfig = typeof combatConfig;
