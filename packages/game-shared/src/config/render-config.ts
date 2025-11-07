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
} as const;

export type RenderConfig = typeof renderConfig;
