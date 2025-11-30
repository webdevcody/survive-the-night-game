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
   * Survivor maximum health points
   */
  SURVIVOR_MAX_HEALTH: 10,

  /**
   * Survivor shooting cooldown in seconds
   */
  SURVIVOR_SHOOT_COOLDOWN: 1.0,

  /**
   * Survivor shooting damage per hit
   */
  SURVIVOR_SHOOT_DAMAGE: 1,

  /**
   * Survivor movement speed when wandering (pixels/second)
   */
  SURVIVOR_WANDER_SPEED: 30,

  /**
   * Duration survivor moves before pausing (seconds)
   */
  SURVIVOR_WANDER_MOVE_DURATION: 2.0,

  /**
   * Duration survivor pauses before moving again (seconds)
   */
  SURVIVOR_WANDER_PAUSE_DURATION: 2.0,

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
   * Distance threshold for considering waypoint reached (in pixels)
   */
  POSITION_THRESHOLD: 1,

  /**
   * Distance threshold for melee movement to consider waypoint reached (in pixels)
   * Increased threshold for faster zombies
   */
  WAYPOINT_REACHED_THRESHOLD: 8,

  /**
   * ========================================================================
   * ZOMBIE SEPARATION BEHAVIOR
   * ========================================================================
   */

  /**
   * Radius to check for nearby zombies for separation (in pixels)
   */
  ZOMBIE_SEPARATION_RADIUS: 8,

  /**
   * Maximum strength of separation force
   */
  ZOMBIE_SEPARATION_STRENGTH: 200,

  /**
   * Weight of separation force relative to pathfinding velocity (0-1)
   * Higher values mean separation has more influence
   */
  ZOMBIE_SEPARATION_WEIGHT: 0.3,

  /**
   * Minimum distance before separation kicks in (in pixels)
   * Prevents jittery movement when zombies are far apart
   */
  ZOMBIE_MIN_SEPARATION_DISTANCE: 4,

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

  /**
   * Car initial health points
   */
  CAR_INITIAL_HEALTH: 20,

  /**
   * Number of explosion effects when car is destroyed
   */
  CAR_DEATH_EXPLOSION_COUNT: 8,

  /**
   * Spread distance for car death explosions (in pixels)
   */
  CAR_DEATH_EXPLOSION_SPREAD: 24,
} as const;

export type EntityConfig = typeof entityConfig;
