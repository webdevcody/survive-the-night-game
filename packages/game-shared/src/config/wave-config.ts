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
  PREPARATION_DURATION: 60,

  /**
   * Active wave duration in seconds
   * Wave will end after this time and transition to preparation
   */
  WAVE_DURATION: 60,

  /**
   * Delay before automatically starting first wave (in seconds)
   */
  FIRST_WAVE_DELAY: 60,

  START_WAVE_NUMBER: 1,

  /**
   * Mapping of wave numbers to boss entity types that should spawn on that wave.
   * Only one boss will spawn per wave (if a boss is already active, no new boss will spawn).
   * Example: { 3: "grave_tyrant", 5: "grave_tyrant", 10: "grave_tyrant" }
   */
  BOSS_WAVE_MAPPING: {
    3: "grave_tyrant",
    5: "charging_tyrant",
    7: "acid_flyer",
    9: "splitter_boss",
  },

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
