import { EntityType } from "../types/entity";

/**
 * Shared utilities for managing entity type-based maps
 * Used by both server EntityManager and client state management
 */

/**
 * Adds an entity to a type-based map
 * Creates the array for the entity type if it doesn't exist
 */
export function addEntityToTypeMap<T extends { getType(): EntityType }>(
  entity: T,
  typeMap: Map<EntityType, T[]>
): void {
  const entityType = entity.getType();
  if (!typeMap.has(entityType)) {
    typeMap.set(entityType, []);
  }
  typeMap.get(entityType)!.push(entity);
}

/**
 * Removes an entity from a type-based map
 * Cleans up empty arrays after removal
 */
export function removeEntityFromTypeMap<T extends { getType(): EntityType }>(
  entity: T,
  typeMap: Map<EntityType, T[]>
): void {
  const entityType = entity.getType();
  const typeEntities = typeMap.get(entityType);
  if (typeEntities) {
    const typeIndex = typeEntities.indexOf(entity);
    if (typeIndex > -1) {
      typeEntities.splice(typeIndex, 1);
    }
    // Clean up empty arrays
    if (typeEntities.length === 0) {
      typeMap.delete(entityType);
    }
  }
}



