/**
 * ========================================================================
 * PLAYER CONFIGURATION
 * ========================================================================
 * Player stats, movement, stamina, and inventory settings
 */

export const playerConfig = {
  /**
   * Maximum player health points
   */
  MAX_PLAYER_HEALTH: 10,

  /**
   * Maximum inventory slots
   */
  MAX_INVENTORY_SLOTS: 10,

  /**
   * Maximum distance for interaction with objects (in pixels)
   */
  MAX_INTERACT_RADIUS: 20,

  /**
   * Radius for automatic item pickup (in pixels)
   * Items within this radius that qualify for auto-pickup will be picked up automatically
   * Smaller than MAX_INTERACT_RADIUS for more intentional pickups
   */
  AUTO_PICKUP_RADIUS: 12,

  /**
   * Player movement speed in pixels per second
   * Used by both client prediction and server authoritative movement
   */
  PLAYER_SPEED: 60,

  /**
   * Speed multiplier when sprinting
   * Applied to PLAYER_SPEED when sprint is active and stamina available
   */
  SPRINT_MULTIPLIER: 1.5,

  /**
   * Maximum stamina points
   */
  MAX_STAMINA: 100,

  /**
   * Stamina drain rate per second while sprinting
   */
  STAMINA_DRAIN_RATE: 25,

  /**
   * Stamina regeneration rate per second when not sprinting
   */
  STAMINA_REGEN_RATE: 10,

  /**
   * Seconds before stamina can regenerate after full depletion
   */
  EXHAUSTION_DURATION: 3.0,

  /**
   * Speed multiplier for zombie players (70% of normal speed)
   */
  ZOMBIE_SPEED_MULTIPLIER: 0.7,
} as const;

export type PlayerConfig = typeof playerConfig;
