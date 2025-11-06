/**
 * ========================================================================
 * CLIENT PREDICTION & RECONCILIATION CONFIGURATION
 * ========================================================================
 *
 * Controls client-side prediction and server reconciliation behavior.
 * Tuning these values affects responsiveness vs. accuracy tradeoff.
 * ========================================================================
 */

// Global type declaration for window.config
declare global {
  interface Window {
    config?: {
      predictions?: {
        showDebugVisuals: boolean;
        interpolationDelayMs: number;
        interpolationMaxSnapshots: number;
        smallErrorThreshold: number;
        largeErrorThreshold: number;
        minLerpSpeed: number;
        maxLerpSpeed: number;
        maxCorrectionVelocity: number;
        enableRollback: boolean;
        maxInputHistory: number;
      };
    };
  }
}

// Initialize window.config.predictions if it doesn't exist
if (typeof window !== "undefined") {
  if (!window.config) {
    window.config = {};
  }
  if (!window.config.predictions) {
    window.config.predictions = {
      showDebugVisuals: true, // Show server ghost position and debug overlays
      interpolationDelayMs: 0, // Delay for interpolating remote player movement
      interpolationMaxSnapshots: 3, // Maximum snapshots kept per entity
      smallErrorThreshold: 20, // Below this, trust client prediction (pixels)
      largeErrorThreshold: 40, // Above this, use rollback or snap (pixels)
      minLerpSpeed: 0.07, // Smooth correction speed for small errors (0-1)
      maxLerpSpeed: 0.2, // Faster correction speed for larger errors (0-1)
      maxCorrectionVelocity: 120, // Maximum correction speed (pixels/second)
      enableRollback: true, // Enable rollback and replay for large errors
      maxInputHistory: 60, // Maximum input snapshots to keep (~1 second at 60fps)
    };
  }
}

// Access values via window.config.predictions.*
// This module initializes the config structure when imported

// Export empty object to ensure this file is treated as a module
export {};
