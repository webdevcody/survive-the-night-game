/**
 * ========================================================================
 * VOTING SYSTEM CONFIGURATION
 * ========================================================================
 * Settings for game mode voting system that appears after game ends
 */

import type { VotableGameMode } from "../types/voting";

export const votingConfig = {
  /**
   * Feature flag to enable/disable game mode voting
   * When false: All games default to the configured default mode, no voting panel shown
   */
  ENABLE_GAME_MODES: false,

  /**
   * Duration of the voting phase in milliseconds
   */
  VOTING_DURATION: 10000,

  /**
   * Game modes that are disabled and cannot be voted for
   * These will show as "Coming Soon" in the voting panel
   */
  DISABLED_MODES: [] as VotableGameMode[],
} as const;

export type VotingConfig = typeof votingConfig;
