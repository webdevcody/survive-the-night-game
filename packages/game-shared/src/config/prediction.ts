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
   * Above this threshold, snap to server position (in pixels)
   * Below this, use gentle or smooth correction
   */
  errorThreshold: 50,

  /**
   * Smooth correction speed when stopped (0-1)
   * Higher = faster correction, lower = smoother
   */
  lerpSpeed: 0.3,

  /**
   * Gentle correction speed during movement (0-1)
   * Should be much lower than lerpSpeed to avoid "mud" feeling
   * This continuously pulls player towards server position while moving
   */
  movementCorrectionSpeed: 0.15,

  /**
   * Minimum error (in pixels) before applying movement correction
   * Prevents jitter from tiny differences
   */
  movementCorrectionThreshold: 7,
};

export type PredictionConfig = typeof predictionConfig;
