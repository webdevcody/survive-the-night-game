/**
 * Client prediction configuration helpers
 *
 * IMPORTANT: To change these values at runtime, use browser console:
 * - window.config.prediction.showDebugVisuals = true
 * - window.config.player.PLAYER_SPEED = 120
 */
import * as NetworkConfig from "@shared/config/network";
import { getConfig } from "@shared/config";

export const SIMULATION_CONFIG = {
  simulatedLatencyMs: NetworkConfig.networkConfig.SIMULATED_LATENCY_MS,
} as const;

// Helper function to get current debug config
export function getDebugConfig() {
  return {
    showServerGhost: getConfig().prediction.showDebugVisuals,
  };
}

// Helper function to get current prediction config with runtime-modifiable values
export function getPredictionConfig() {
  return {
    playerSpeed: getConfig().player.PLAYER_SPEED,
    sprintMultiplier: getConfig().player.SPRINT_MULTIPLIER,
  };
}
