/**
 * ========================================================================
 * CLIENT PREDICTION & RECONCILIATION CONFIGURATION
 * ========================================================================
 *
 * Controls client-side prediction and server reconciliation behavior.
 * Tuning these values affects responsiveness vs. accuracy tradeoff.
 */

export const predictionConfig = {
  /**
   * Show server ghost position and debug overlays
   */
  showDebugVisuals: false,

  /**
   * Below this threshold, trust client prediction (in pixels)
   */
  smallErrorThreshold: 15,

  /**
   * Above this threshold, snap to server position (in pixels)
   */
  largeErrorThreshold: 25,

  /**
   * Smooth correction speed for small errors (0-1)
   */
  minLerpSpeed: 0.15,

  /**
   * Faster correction speed for larger errors (0-1)
   */
  maxLerpSpeed: 0.2,
};

export type PredictionConfig = typeof predictionConfig;
