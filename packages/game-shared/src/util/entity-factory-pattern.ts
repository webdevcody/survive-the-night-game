import { EntityType } from "../types/entity";

/**
 * Shared entity factory pattern utilities
 * Provides a generic factory pattern that can be used by both server and client
 */

export interface EntityFactoryAdapter<T> {
  /**
   * Get a custom entity constructor from the override registry
   */
  getOverrideConstructor(entityType: EntityType): (() => T) | undefined;

  /**
   * Create a generic entity from item registry
   */
  createGenericFromItem(entityType: EntityType): T | null;

  /**
   * Create a generic entity from resource registry
   */
  createGenericFromResource(entityType: EntityType): T | null;

  /**
   * Log a warning when entity creation fails
   */
  logCreationFailure(entityType: EntityType, reason: string): void;
}

/**
 * Generic entity factory pattern
 * Handles the common pattern: check override registry -> fallback to generic creation
 */
export function createEntityWithFactory<T>(
  entityType: EntityType,
  adapter: EntityFactoryAdapter<T>
): T | null {
  // First check override registry for custom entity classes
  const overrideConstructor = adapter.getOverrideConstructor(entityType);
  if (overrideConstructor) {
    try {
      return overrideConstructor();
    } catch (error) {
      adapter.logCreationFailure(entityType, `Override constructor failed: ${error}`);
      return null;
    }
  }

  // Fallback to generic entity generation from configs
  const genericEntity = createGenericEntity(entityType, adapter);
  if (genericEntity) {
    return genericEntity;
  }

  adapter.logCreationFailure(entityType, "Unknown entity type");
  return null;
}

/**
 * Attempts to create a generic entity from registries
 */
function createGenericEntity<T>(
  entityType: EntityType,
  adapter: EntityFactoryAdapter<T>
): T | null {
  // Try to create from item registry
  const itemEntity = adapter.createGenericFromItem(entityType);
  if (itemEntity) {
    return itemEntity;
  }

  // Try to create from resource registry
  const resourceEntity = adapter.createGenericFromResource(entityType);
  if (resourceEntity) {
    return resourceEntity;
  }

  // Could add other registry checks here (weapons, environment, etc.)
  // For now, we'll focus on items and resources

  return null;
}


