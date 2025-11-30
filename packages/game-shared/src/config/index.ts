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
import { entityConfig, EntityConfig } from "@/config/entity-config";
import { votingConfig, type VotingConfig } from "./voting-config";
import { infectionConfig, type InfectionConfig } from "./infection-config";
import { hudConfig, type HudConfig } from "./hud-config";
import { aiPlayerConfig, type AiPlayerConfig } from "./ai-player-config";
/**
 * Combined game configuration object
 */
export interface GameConfig {
  meta: MetaConfig;
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
  entity: EntityConfig;
  voting: VotingConfig;
  infection: InfectionConfig;
  hud: HudConfig;
  aiPlayer: AiPlayerConfig;
}

/**
 * Default configuration values
 */
const defaultConfig: GameConfig = {
  meta: metaConfig,
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
  entity: entityConfig,
  voting: votingConfig,
  infection: infectionConfig,
  hud: hudConfig,
  aiPlayer: aiPlayerConfig,
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
  votingConfig,
  infectionConfig,
  hudConfig,
  aiPlayerConfig,
};

/**
 * Re-export types
 */
export type {
  MetaConfig,
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
  VotingConfig,
  InfectionConfig,
  HudConfig,
  AiPlayerConfig,
};

/**
 * Re-export merchant types
 */
export type { MerchantShopItem } from "./merchant-config";
