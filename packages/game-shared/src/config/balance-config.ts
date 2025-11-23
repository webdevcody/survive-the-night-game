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
} as const;

export type BalanceConfig = typeof balanceConfig;
