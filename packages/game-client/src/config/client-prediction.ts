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
        interpolationDelayMs: number;
        interpolationMaxSnapshots: number;
        smallErrorThreshold: number;
        largeErrorThreshold: number;
        minLerpSpeed: number;
        maxLerpSpeed: number;
        maxCorrectionVelocity: number;
        enableRollback: boolean;
        maxInputHistory: number;
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

// Helper function to get current interpolation config
export function getInterpolationConfig() {
  return {
    delayMs: window.config?.predictions?.interpolationDelayMs ?? 0,
    maxSnapshots: window.config?.predictions?.interpolationMaxSnapshots ?? 3,
  };
}
