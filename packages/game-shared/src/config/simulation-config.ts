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
};

export type SimulationConfig = typeof simulationConfig;
