/**
 * ========================================================================
 * WAVE SYSTEM CONFIGURATION
 * ========================================================================
 * Settings for wave-based zombie spawning system
 */

export const waveConfig = {
  /**
   * Preparation phase duration in seconds (time between waves)
   */
  PREPARATION_DURATION: 90,

  /**
   * Active wave duration in seconds
   * Wave will end after this time and transition to preparation
   */
  WAVE_DURATION: 30,

  /**
   * Delay before automatically starting first wave (in seconds)
   */
  FIRST_WAVE_DELAY: 10,

  /**
   * Whether waves auto-start after preparation or require manual trigger
   */
  AUTO_START_WAVES: true,

  /**
   * Number of crates to spawn per wave
   */
  CRATES_SPAWNED_PER_WAVE: 2,
} as const;

export type WaveConfig = typeof waveConfig;
