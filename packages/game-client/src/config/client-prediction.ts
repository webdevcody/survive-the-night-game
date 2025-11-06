/**
 * Re-exports from prediction.ts, network.ts and game-config.ts
 *
 * IMPORTANT: To change these values, edit:
 * - packages/game-shared/src/config/prediction.ts (prediction/reconciliation)
 * - packages/game-shared/src/config/network.ts (network simulation)
 * - packages/game-shared/src/config/game-config.ts (game mechanics)
 */
import "@shared/config/prediction"; // Initialize window.config.predictions
import * as NetworkConfig from "@shared/config/network";
import { PLAYER_SPEED, SPRINT_MULTIPLIER } from "@shared/config/game-config";

// Re-export the global type for window.config
declare global {
  interface Window {
    config?: {
      predictions?: {
        showDebugVisuals: boolean;
        smallErrorThreshold: number;
        largeErrorThreshold: number;
        minLerpSpeed: number;
        maxLerpSpeed: number;
      };
    };
  }
}

export const SIMULATION_CONFIG = {
  simulatedLatencyMs: NetworkConfig.SIMULATED_LATENCY_MS,
} as const;

// Helper function to get current debug config
export function getDebugConfig() {
  return {
    showServerGhost: window.config?.predictions?.showDebugVisuals ?? true,
  };
}

export const PREDICTION_CONFIG = {
  playerSpeed: PLAYER_SPEED,
  sprintMultiplier: SPRINT_MULTIPLIER,
} as const;
