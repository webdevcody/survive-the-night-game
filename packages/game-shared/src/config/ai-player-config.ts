/**
 * ========================================================================
 * AI PLAYER CONFIGURATION
 * ========================================================================
 * Controls dynamic AI player management based on real player count.
 */

export const aiPlayerConfig = {
  /**
   * Target total player count (real + AI).
   * AI players are added/removed to maintain this count.
   * Example: With threshold of 4, if 2 real players join, 2 AI players remain.
   */
  TOTAL_PLAYER_THRESHOLD: 4,

  /**
   * Minimum AI players regardless of real player count.
   * Set to 0 to allow all AI to be removed when enough real players join.
   */
  MIN_AI_PLAYERS: 0,
} as const;

export type AiPlayerConfig = typeof aiPlayerConfig;
