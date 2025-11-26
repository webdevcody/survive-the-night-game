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
   * Baseball bat melee attack range in pixels
   */
  BASEBALL_BAT_ATTACK_RANGE: 40,

  /**
   * Zombie attack radius in pixels
   */
  ZOMBIE_ATTACK_RADIUS: 4,

  /**
   * Bullet visual size in pixels
   */
  BULLET_SIZE: 4,

  /**
   * ========================================================================
   * PROJECTILE CONSTANTS
   * ========================================================================
   */

  /**
   * Movement step size for projectile collision detection (pixels per step)
   * Used by bullets, arrows, flames, throwing knives, etc.
   */
  PROJECTILE_STEP_SIZE: 10,

  /**
   * Bullet travel speed (pixels per second)
   */
  BULLET_SPEED: 400,

  /**
   * Standard projectile speed for arrows, flames, throwing knives, grenade projectiles
   */
  PROJECTILE_SPEED_STANDARD: 200,

  /**
   * Slow projectile speed (acid projectiles)
   */
  PROJECTILE_SPEED_SLOW: 100,

  /**
   * Throw speed for grenades and molotovs
   */
  THROW_SPEED: 130,

  /**
   * Bullet/flame max travel distance
   */
  TRAVEL_DISTANCE_MEDIUM: 200,

  /**
   * Arrow/throwing knife max travel distance
   */
  TRAVEL_DISTANCE_SHORT: 100,

  /**
   * Grenade projectile max travel distance
   */
  TRAVEL_DISTANCE_LONG: 300,

  /**
   * Ranged attack range for enemies and NPCs
   */
  RANGED_ATTACK_RANGE: 100,

  /**
   * Standard explosion damage (grenade, exploding zombie)
   */
  EXPLOSION_DAMAGE_STANDARD: 5,

  /**
   * ========================================================================
   * EXPLOSION CONSTANTS
   * ========================================================================
   */

  /**
   * Small explosion radius in pixels (exploding zombie, etc.)
   */
  EXPLOSION_RADIUS_SMALL: 32,

  /**
   * Medium explosion radius in pixels (grenade, molotov)
   */
  EXPLOSION_RADIUS_MEDIUM: 64,

  /**
   * Landmine explosion radius in pixels
   */
  LANDMINE_EXPLOSION_RADIUS: 32,

  /**
   * ========================================================================
   * TRIGGER RADIUS CONSTANTS
   * ========================================================================
   */

  /**
   * Default trigger radius for pickups and traps (landmine, bear trap, coin)
   */
  ITEM_TRIGGER_RADIUS: 16,

  /**
   * ========================================================================
   * WEAPON COOLDOWN CONSTANTS
   * ========================================================================
   */

  /**
   * Grenade/Molotov cooldown in seconds
   */
  THROWABLE_COOLDOWN: 0.5,

  /**
   * Throwing knife cooldown in seconds
   */
  THROWING_KNIFE_COOLDOWN: 0.3,

  /**
   * Explosion delay for grenades and molotovs in seconds
   */
  EXPLOSION_DELAY: 1,

  /**
   * Fire spread radius for molotov in pixels
   */
  MOLOTOV_FIRE_SPREAD_RADIUS: 48,

  /**
   * Number of fire entities spawned by molotov
   */
  MOLOTOV_FIRE_COUNT: 8,

  /**
   * ========================================================================
   * TRIGGER CHECK CONSTANTS
   * ========================================================================
   */

  /**
   * One-time trigger check interval in seconds
   */
  TRIGGER_CHECK_INTERVAL: 0.25,
} as const;

export type CombatConfig = typeof combatConfig;
