/**
 * ========================================================================
 * VOTING SYSTEM CONFIGURATION
 * ========================================================================
 * Settings for game mode voting system that appears after game ends
 */

import type { VotableGameMode } from "../types/voting";

export const votingConfig = {
  /**
   * Duration of the voting phase in milliseconds
   */
  VOTING_DURATION: 10000,

  /**
   * Delay after game over before voting panel appears (in milliseconds)
   * This allows players to see the game over dialog briefly
   */
  GAME_OVER_DISPLAY_DURATION: 3000,

  /**
   * Game modes that are disabled and cannot be voted for
   * These will show as "Coming Soon" in the voting panel
   */
  DISABLED_MODES: [] as VotableGameMode[],
} as const;

export type VotingConfig = typeof votingConfig;
