/**
 * ========================================================================
 * HUD CONFIGURATION
 * ========================================================================
 * Client-side HUD settings for indicators and UI elements
 */

export const hudConfig = {
  /**
   * Crate indicator settings (shows direction to supply crates)
   */
  crateIndicators: {
    arrowSize: 30,
    arrowDistance: 60,
    arrowColor: "rgba(255, 50, 50, 0.9)",
    spriteSize: 32,
    /** Minimum distance (in pixels) before showing indicator - increase to hide when closer */
    minDistance: 100,
  },

  /**
   * Survivor indicator settings (shows direction to survivors needing rescue)
   */
  survivorIndicators: {
    arrowSize: 30,
    arrowDistance: 60,
    arrowColor: "rgba(50, 255, 50, 0.9)", // Green for survivors
    spriteSize: 32,
    /** Minimum distance (in pixels) before showing indicator - increase to hide when closer */
    minDistance: 100,
  },

  /**
   * Human indicator settings (shows direction to human players for zombie players)
   * Only visible to zombie players in infection/battle royale modes
   */
  humanIndicators: {
    arrowSize: 30,
    arrowDistance: 60,
    arrowColor: "rgba(255, 50, 50, 0.9)", // Red for human targets
    spriteSize: 32,
    /** Minimum distance (in pixels) before showing indicator - increase to hide when closer */
    minDistance: 300,
  },
} as const;

export type HudConfig = typeof hudConfig;
