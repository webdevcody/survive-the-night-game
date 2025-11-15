/**
 * ========================================================================
 * COMBAT CONFIGURATION
 * ========================================================================
 * Combat ranges, weapon stats, and damage settings
 */

export const entityConfig = {
  ENTITY_DESPAWN_TIME_MS: 1000 * 120, // 2 minutes
} as const;

export type EntityConfig = typeof entityConfig;
