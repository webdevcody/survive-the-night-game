/**
 * ========================================================================
 * ENVIRONMENTAL EVENTS CONFIGURATION
 * ========================================================================
 * Settings for random environmental events that occur during waves
 */

export const environmentalEventsConfig = {
  /**
   * Toxic Gas Event Configuration
   */
  TOXIC_GAS: {
    /**
     * Chance to trigger toxic gas event after wave completion (0.0 to 1.0)
     */
    TRIGGER_CHANCE: 0.15,

    /**
     * Minimum wave number before toxic gas can trigger (after first wave)
     */
    MIN_WAVE: 2,

    /**
     * Number of initial clouds to spawn
     */
    CLOUD_COUNT: {
      min: 3,
      max: 5,
    },

    /**
     * Growth interval in seconds (how often clouds expand)
     */
    GROWTH_INTERVAL: 1,

    /**
     * Lifetime of original spawn clouds in seconds (before they despawn)
     */
    ORIGINAL_LIFETIME: 10,

    /**
     * Minimum distance between cloud spawn points in pixels
     */
    SPAWN_MIN_DISTANCE: 200,

    /**
     * Primary direction weight (0.0 to 1.0)
     * Higher = more likely to expand in primary direction
     */
    PRIMARY_DIRECTION_WEIGHT: 0.7,
  },
} as const;

export type EnvironmentalEventsConfig = typeof environmentalEventsConfig;
