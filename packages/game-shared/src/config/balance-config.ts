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
  BASE_PURCHASE_PRICE: 0,
  /**
   * Item spawn multiplier specifically for Battle Royale mode
   * Higher than default open world to ensure players find adequate loot
   */
  BATTLE_ROYALE_ITEM_SPAWN_MULTIPLIER: 1,
  /**
   * Global multiplier for zombie item drop chance
   * Applied to zombie drop chances when they spawn
   * Value of 0.01 means zombies drop items 1% as often as configured
   */
  ZOMBIE_ITEM_DROP_MULTIPLIER: 1,
} as const;

export type BalanceConfig = typeof balanceConfig;
