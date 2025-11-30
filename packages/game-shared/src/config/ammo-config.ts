/**
 * ========================================================================
 * AMMO CONFIGURATION
 * ========================================================================
 * Default ammo stack sizes for all ammunition types.
 */

export const ammoConfig = {
  /**
   * Default stack size for pistol ammo pickups
   */
  PISTOL_AMMO_DEFAULT_COUNT: 8,

  /**
   * Default stack size for shotgun ammo pickups
   */
  SHOTGUN_AMMO_DEFAULT_COUNT: 8,

  /**
   * Default stack size for AK-47 ammo pickups
   */
  AK47_AMMO_DEFAULT_COUNT: 30,

  /**
   * Default stack size for bolt action rifle ammo pickups
   */
  BOLT_ACTION_AMMO_DEFAULT_COUNT: 10,

  /**
   * Default stack size for arrow ammo pickups
   */
  ARROW_AMMO_DEFAULT_COUNT: 16,

  /**
   * Default stack size for flamethrower ammo pickups
   */
  FLAMETHROWER_AMMO_DEFAULT_COUNT: 30,

  /**
   * Default stack size for grenade launcher ammo pickups
   */
  GRENADE_LAUNCHER_AMMO_DEFAULT_COUNT: 4,
} as const;

export type AmmoConfig = typeof ammoConfig;
