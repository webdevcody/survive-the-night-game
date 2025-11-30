/**
 * ========================================================================
 * INFECTION MODE CONFIGURATION
 * ========================================================================
 * Settings for the Infection game mode where one player starts as
 * "Patient Zero" and must infect others or destroy the car.
 */

export const infectionConfig = {
  /**
   * Number of shared zombie lives per human player
   * Total zombie lives = LIVES_PER_HUMAN * number of human players
   */
  LIVES_PER_HUMAN: 3,

  /**
   * Number of AI humans to spawn to help defend the car
   */
  AI_HUMAN_COUNT: 4,

  /**
   * Delay in milliseconds before selecting Patient Zero
   * Allows all players to spawn and load in first
   */
  INITIAL_ZOMBIE_DELAY_MS: 3000,

  /**
   * Minimum number of players required to start infection mode
   */
  MIN_PLAYERS: 2,

  /**
   * Game duration in milliseconds
   * If humans survive this long, they win
   * Default: 5 minutes (300000ms)
   */
  GAME_DURATION_MS: 5 * 60 * 1000,

  /**
   * Cooldown in milliseconds for zombie players to spawn minions
   * Default: 10 seconds (10000ms)
   */
  ZOMBIE_SPAWN_COOLDOWN_MS: 10000,

  /**
   * Maximum radius in pixels from zombie player where they can spawn minions
   * Default: 128 pixels (8 tiles)
   */
  ZOMBIE_SPAWN_RADIUS: 128,
} as const;

export type InfectionConfig = typeof infectionConfig;
