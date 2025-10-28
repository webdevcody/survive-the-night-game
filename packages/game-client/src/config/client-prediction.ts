/**
 * Re-exports from game-config.ts
 *
 * IMPORTANT: To change these values, edit:
 * packages/game-shared/src/config/game-config.ts
 */
import * as GameConfig from "@shared/config/game-config";

export const SIMULATION_CONFIG = {
  simulatedLatencyMs: GameConfig.SIMULATED_LATENCY_MS,
  enablePrediction: GameConfig.CLIENT_PREDICTION_ENABLED,
} as const;

export const DEBUG_CONFIG = {
  showServerGhost: GameConfig.SHOW_DEBUG_VISUALS,
} as const;

export const PREDICTION_CONFIG = {
  playerSpeed: GameConfig.PLAYER_SPEED,
  sprintMultiplier: GameConfig.SPRINT_MULTIPLIER,
} as const;

export const INTERPOLATION_CONFIG = {
  delayMs: GameConfig.INTERPOLATION_DELAY_MS,
  maxSnapshots: GameConfig.INTERPOLATION_MAX_SNAPSHOTS,
} as const;

export const RECONCILIATION_CONFIG = {
  snapThreshold: GameConfig.SNAP_THRESHOLD,
} as const;
