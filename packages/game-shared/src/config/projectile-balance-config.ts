/**
 * ========================================================================
 * PROJECTILE BALANCE CONFIGURATION
 * ========================================================================
 * Configuration for projectile behavior, weapon balance, and throwable tweaks.
 */

export const projectileBalanceConfig = {
  /**
   * ========================================================================
   * FLAME PROJECTILE
   * ========================================================================
   */

  /**
   * Spread angle for flame projectiles (in degrees)
   * Each flame deviates by +/- half this value
   */
  FLAME_SPREAD_ANGLE: 15,

  /**
   * ========================================================================
   * MOLOTOV COCKTAIL
   * ========================================================================
   */

  /**
   * Base explosion damage from molotov cocktail
   * Actual damage scales based on distance from center
   */
  MOLOTOV_EXPLOSION_DAMAGE: 3,

  /**
   * Velocity friction multiplier for molotov (applied each frame)
   * Lower values = more friction, slows down faster
   */
  MOLOTOV_VELOCITY_FRICTION: 0.95,

  /**
   * ========================================================================
   * WEAPON RECOIL SCALES
   * ========================================================================
   */

  /**
   * Recoil strength scale for pistol (multiplied by base recoilKnockback)
   */
  PISTOL_RECOIL_SCALE: 0.35,
} as const;

export type ProjectileBalanceConfig = typeof projectileBalanceConfig;
