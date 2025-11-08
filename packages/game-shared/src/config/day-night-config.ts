/**
 * ========================================================================
 * DAY/NIGHT CYCLE CONFIGURATION
 * ========================================================================
 * Settings for day/night cycle timing
 */

export const dayNightConfig = {
  /**
   * Day duration in seconds
   */
  DAY_DURATION: 5,

  /**
   * Night duration in seconds
   */
  NIGHT_DURATION: 60,
} as const;

export type DayNightConfig = typeof dayNightConfig;
