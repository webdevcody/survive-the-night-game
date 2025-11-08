/**
 * ========================================================================
 * RENDER CONFIGURATION
 * ========================================================================
 * Client-side rendering settings and optimizations
 */

export const renderConfig = {
  /**
   * Maximum distance from player to render entities (in pixels)
   * Entities beyond this radius are culled from rendering for performance
   */
  ENTITY_RENDER_RADIUS: 400,

  /**
   * Whether to show health bars above entities
   * Set to false to hide health bars on players, zombies, and buildings
   */
  showHealthBars: false,
} as const;

export type RenderConfig = typeof renderConfig;
