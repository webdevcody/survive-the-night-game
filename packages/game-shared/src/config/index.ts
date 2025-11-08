/**
 * ========================================================================
 * GAME CONFIGURATION - INDEX
 * ========================================================================
 *
 * Central configuration access point with runtime modification support.
 *
 * Usage:
 * - Import using: import { getConfig } from '@game-shared/config'
 * - Access configs: getConfig().player.PLAYER_SPEED
 * - Modify at runtime via browser console: window.config.player.PLAYER_SPEED = 100
 */

import { metaConfig, type MetaConfig } from "./meta-config";
import { dayNightConfig, type DayNightConfig } from "./day-night-config";
import { waveConfig, type WaveConfig } from "./wave-config";
import { worldConfig, type WorldConfig } from "./world-config";
import { playerConfig, type PlayerConfig } from "./player-config";
import { combatConfig, type CombatConfig } from "./combat-config";
import { simulationConfig, type SimulationConfig } from "./simulation-config";
import { keybindingsConfig, type KeybindingsConfig } from "./keybindings-config";
import { merchantConfig, type MerchantConfig } from "./merchant-config";
import { predictionConfig, type PredictionConfig } from "./prediction";
import { networkConfig, type NetworkConfig } from "./network";
import { renderConfig, type RenderConfig } from "./render-config";
/**
 * Combined game configuration object
 */
export interface GameConfig {
  meta: MetaConfig;
  dayNight: DayNightConfig;
  wave: WaveConfig;
  world: WorldConfig;
  player: PlayerConfig;
  combat: CombatConfig;
  simulation: SimulationConfig;
  keybindings: KeybindingsConfig;
  merchant: MerchantConfig;
  prediction: PredictionConfig;
  network: NetworkConfig;
  render: RenderConfig;
}

/**
 * Default configuration values
 */
const defaultConfig: GameConfig = {
  meta: metaConfig,
  dayNight: dayNightConfig,
  wave: waveConfig,
  world: worldConfig,
  player: playerConfig,
  combat: combatConfig,
  simulation: simulationConfig,
  keybindings: keybindingsConfig,
  merchant: merchantConfig,
  prediction: predictionConfig,
  network: networkConfig,
  render: renderConfig,
};

/**
 * Extend window interface to include config
 */
declare global {
  interface Window {
    config?: GameConfig;
  }
}

/**
 * Get the current game configuration.
 *
 * This function checks if config overrides exist on the window object
 * (for runtime modification via browser console) and falls back to
 * default values if not.
 *
 * @returns The current game configuration
 *
 * @example
 * // In game code
 * const speed = getConfig().player.PLAYER_SPEED;
 *
 * @example
 * // In browser console for runtime modification
 * window.config.player.PLAYER_SPEED = 120;
 */
export function getConfig(): GameConfig {
  // Initialize window.config if it doesn't exist (browser environment)
  if (typeof window !== "undefined" && !window.config) {
    window.config = defaultConfig;
  }

  const configToReturn =
    typeof window !== "undefined" && window.config ? window.config : defaultConfig;
  return configToReturn;
}

/**
 * Re-export individual config modules for direct access if needed
 */
export {
  metaConfig,
  dayNightConfig,
  waveConfig,
  worldConfig,
  playerConfig,
  combatConfig,
  simulationConfig,
  keybindingsConfig,
  merchantConfig,
  predictionConfig,
  networkConfig,
  renderConfig,
};

/**
 * Re-export types
 */
export type {
  MetaConfig,
  DayNightConfig,
  WaveConfig,
  WorldConfig,
  PlayerConfig,
  CombatConfig,
  SimulationConfig,
  KeybindingsConfig,
  MerchantConfig,
  PredictionConfig,
  NetworkConfig,
  RenderConfig,
};

/**
 * Re-export merchant types
 */
export type { MerchantShopItem } from "./merchant-config";
