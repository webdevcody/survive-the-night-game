/**
 * ========================================================================
 * ENVIRONMENTAL EVENTS CONFIGURATION
 * ========================================================================
 * Settings for random environmental events (time-based rolls on the server)
 */

export const environmentalEventsConfig = {
  /**
   * How often (seconds) the server evaluates toxic gas / thunderstorm rolls
   */
  CYCLE_INTERVAL_SECONDS: 120,

  /**
   * Toxic Gas Event Configuration
   */
  TOXIC_GAS: {
    /**
     * Chance to trigger toxic gas event on each cycle roll (0.0 to 1.0)
     */
    TRIGGER_CHANCE: 0.15,

    /**
     * Minimum completed cycle index before toxic gas can trigger (same semantics as former MIN_WAVE)
     */
    MIN_CYCLE: 2,

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

  /**
   * Thunderstorm Event Configuration
   */
  THUNDERSTORM: {
    /**
     * Chance to trigger thunderstorm event on each cycle roll (0.0 to 1.0)
     */
    TRIGGER_CHANCE: 0.15,

    /**
     * Minimum completed cycle index before thunderstorm can trigger
     */
    MIN_CYCLE: 2,

    /**
     * Duration of thunderstorm event in seconds
     */
    DURATION: 85,

    /**
     * Lightning flash interval range in seconds
     */
    LIGHTNING_INTERVAL: {
      min: 3,
      max: 10,
    },
  },
} as const;

export type EnvironmentalEventsConfig = typeof environmentalEventsConfig;
