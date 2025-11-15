/**
 * ========================================================================
 * ENTITY CONFIGURATION
 * ========================================================================
 * Everything about entities
 */

export const entityConfig = {
  ENTITY_DESPAWN_TIME_MS: 1000 * 120, // 2 minutes
} as const;

export type EntityConfig = typeof entityConfig;
