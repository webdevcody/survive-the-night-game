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

  RENDER_DARKNESS: true,

  /**
   * Whether to show health bars above entities
   * Set to false to hide health bars on players, zombies, and buildings
   */
  showHealthBars: false,

  /**
   * Camera snap distance threshold (in pixels)
   * If the camera is further than this distance from its target position,
   * it will snap instantly instead of smoothly lerping. This prevents the
   * camera from lagging too far behind during teleportation or rapid movement.
   */
  CAMERA_SNAP_DISTANCE_THRESHOLD: 100,
} as const;

export type RenderConfig = typeof renderConfig;
