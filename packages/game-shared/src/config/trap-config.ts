/**
 * ========================================================================
 * TRAP CONFIGURATION
 * ========================================================================
 * Configuration for defensive structures like landmines and bear traps.
 */

export const trapConfig = {
  /**
   * ========================================================================
   * LANDMINE
   * ========================================================================
   */

  /**
   * Damage dealt by landmine explosion
   */
  LANDMINE_DAMAGE: 7,

  /**
   * Time in seconds before landmine becomes active after placement
   */
  LANDMINE_ACTIVATION_DELAY: 2,

  /**
   * ========================================================================
   * BEAR TRAP
   * ========================================================================
   */

  /**
   * Damage dealt when bear trap snares an entity
   */
  BEAR_TRAP_DAMAGE: 1,
} as const;

export type TrapConfig = typeof trapConfig;
