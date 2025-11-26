/**
 * ========================================================================
 * ENTITY CONFIGURATION
 * ========================================================================
 * Everything about entities
 */

export const entityConfig = {
  ENTITY_DESPAWN_TIME_MS: 1000 * 120, // 2 minutes

  /**
   * ========================================================================
   * PLAYER CONSTANTS
   * ========================================================================
   */

  /**
   * Player respawn cooldown in milliseconds
   */
  PLAYER_RESPAWN_COOLDOWN_MS: 5000,

  /**
   * Player interact cooldown in seconds
   */
  PLAYER_INTERACT_COOLDOWN: 0.25,

  /**
   * Player pickup hold duration in seconds
   */
  PLAYER_PICKUP_HOLD_DURATION: 0.5,

  /**
   * ========================================================================
   * SURVIVOR/NPC CONSTANTS
   * ========================================================================
   */

  /**
   * Survivor shooting range in pixels
   */
  SURVIVOR_SHOOT_RANGE: 100,

  /**
   * Survivor wander radius in pixels
   */
  SURVIVOR_WANDER_RADIUS: 100,

  /**
   * ========================================================================
   * ENEMY AI CONSTANTS
   * ========================================================================
   */

  /**
   * Path recalculation interval for enemies (seconds)
   */
  PATH_RECALCULATION_INTERVAL: 1,

  /**
   * Friendly entity search radius for enemies
   */
  FRIENDLY_SEARCH_RADIUS: 500,

  /**
   * Target check interval for enemies (seconds)
   */
  TARGET_CHECK_INTERVAL: 1,

  /**
   * Player check interval for idle enemies (seconds)
   */
  PLAYER_CHECK_INTERVAL: 0.5,

  /**
   * Idle enemy activation radius (pixels)
   */
  IDLE_ACTIVATION_RADIUS: 100,

  /**
   * Melee movement stuck detection time in seconds
   */
  STUCK_DETECTION_TIME: 0.3,

  /**
   * ========================================================================
   * VEHICLE CONSTANTS
   * ========================================================================
   */

  /**
   * Car attack message cooldown in milliseconds
   */
  CAR_ATTACK_MESSAGE_COOLDOWN_MS: 5000,

  /**
   * Car repair cooldown in milliseconds
   */
  CAR_REPAIR_COOLDOWN_MS: 1000,
} as const;

export type EntityConfig = typeof entityConfig;
