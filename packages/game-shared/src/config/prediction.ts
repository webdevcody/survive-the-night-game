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
        smallErrorThreshold: number;
        largeErrorThreshold: number;
        minLerpSpeed: number;
        maxLerpSpeed: number;
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
      showDebugVisuals: false, // Show server ghost position and debug overlays
      smallErrorThreshold: 10, // Below this, trust client prediction (pixels)
      largeErrorThreshold: 40, // Above this, snap to server (pixels)
      minLerpSpeed: 0.07, // Smooth correction speed for small errors (0-1)
      maxLerpSpeed: 0.2, // Faster correction speed for larger errors (0-1)
    };
  }
}

// Access values via window.config.predictions.*
// This module initializes the config structure when imported

// Export empty object to ensure this file is treated as a module
export {};
