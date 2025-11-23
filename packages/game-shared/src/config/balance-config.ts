/**
 * ========================================================================
 * COMBAT CONFIGURATION
 * ========================================================================
 * Combat ranges, weapon stats, and damage settings
 */

export const balanceConfig = {
  /**
   * Knife melee attack range in pixels
   */
  BASE_PURCHASE_PRICE: 5,
  /**
   * Global multiplier for item spawn chance on the map
   * Applied to all item spawn chances (items, weapons, resources)
   * Value of 0.01 means items spawn 1% as often as configured
   */
  MAP_ITEM_SPAWN_MULTIPLIER: 0.7,
  /**
   * Global multiplier for zombie item drop chance
   * Applied to zombie drop chances when they spawn
   * Value of 0.01 means zombies drop items 1% as often as configured
   */
  ZOMBIE_ITEM_DROP_MULTIPLIER: 0.7,
} as const;

export type BalanceConfig = typeof balanceConfig;
