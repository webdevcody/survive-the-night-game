/**
 * ========================================================================
 * SIMULATION CONFIGURATION
 * ========================================================================
 * Tick rates, physics timesteps, and simulation settings
 */

import { playerConfig } from "./player-config";

export const simulationConfig = {
  /**
   * Server tick rate (simulation rate)
   * Both client and server must use this for physics calculations
   */
  SIMULATION_TICK_RATE: 20, // ticks per second

  /**
   * Fixed timestep in seconds
   * Calculated from tick rate
   */
  get FIXED_TIMESTEP() {
    return 1 / this.SIMULATION_TICK_RATE; // 0.05 seconds
  },

  /**
   * Player movement distance per physics tick (in pixels)
   */
  get PLAYER_MOVEMENT_PER_TICK() {
    return playerConfig.PLAYER_SPEED * this.FIXED_TIMESTEP; // 3 pixels
  },

  /**
   * Entity update tier configuration for distance-based update frequency optimization
   * Entities are grouped into tiers based on distance to nearest player
   */
  UPDATE_TIERS: {
    /**
     * Enable/disable the tiered update system
     * When disabled, all entities update every frame (default behavior)
     */
    ENABLED: true,

    /**
     * Tier 1 (Active): Entities close to players
     * Range: 0-500px, Update frequency: Every frame (1x)
     */
    TIER_1: {
      MAX_RANGE: 500,
      UPDATE_INTERVAL: 1, // Update every frame
    },

    /**
     * Tier 2 (Medium): Entities at medium distance
     * Range: 500-1000px, Update frequency: Every 2 frames (0.5x)
     */
    TIER_2: {
      MAX_RANGE: 1000,
      UPDATE_INTERVAL: 2, // Update every 2 frames
    },

    /**
     * Tier 3 (Far): Entities far from players
     * Range: 1000+px, Update frequency: Every 4 frames (0.25x)
     */
    TIER_3: {
      MAX_RANGE: Infinity,
      UPDATE_INTERVAL: 4, // Update every 4 frames
    },

    /**
     * How often to recalculate entity tiers (in frames)
     * Lower values = more accurate but more expensive
     * Higher values = less accurate but better performance
     */
    TIER_RECALCULATION_INTERVAL: 10, // Recalculate tiers every 10 frames
  },
};

export type SimulationConfig = typeof simulationConfig;
