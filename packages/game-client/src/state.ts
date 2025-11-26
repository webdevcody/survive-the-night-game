import { ClientEntityBase } from "@/extensions/client-entity";
import { WaveState } from "@shared/types/wave";
import { EntityType } from "@shared/types/entity";
import { GameModeId } from "@shared/events/server-sent/events/game-started-event";

export type GameState = {
  startedAt: number;
  playerId: number;
  entities: ClientEntityBase[];
  entityMap: Map<number, ClientEntityBase>;
  entitiesByType: Map<EntityType, ClientEntityBase[]>;
  // Game mode
  gameMode: GameModeId;
  // Wave system
  waveNumber: number;
  waveState: WaveState;
  phaseStartTime: number;
  phaseDuration: number;
  totalZombies?: number;
  crafting: boolean;
  // Server time synchronization
  serverTimeOffset: number; // Offset in milliseconds: clientTime - serverTime
  // Cached closest interactive entity ID (calculated once per frame in renderer)
  closestInteractiveEntityId?: number | null;
  // Delta time in seconds for the current frame (used for time-based lerping)
  dt: number;
  // Global illumination multiplier (affects all light sources)
  globalIlluminationMultiplier: number;
  // Darkness hue ("red" or "blue")
  darknessHue: "red" | "blue";
};

export function getEntityById(gameState: GameState, id: number): ClientEntityBase | undefined {
  return gameState.entityMap.get(id);
}

/**
 * Helper function to get entities by type
 */
export function getEntitiesByType(gameState: GameState, type: EntityType): ClientEntityBase[] {
  return gameState.entitiesByType.get(type) ?? [];
}

/**
 * Helper function to add an entity to both the array and map
 */
export function addEntity(gameState: GameState, entity: ClientEntityBase): void {
  // Safety check: if entity with this ID already exists, remove it first to prevent duplicates
  if (gameState.entityMap.has(entity.getId())) {
    console.warn(`[Client] addEntity called for existing ID ${entity.getId()}. removing old entity.`);
    removeEntity(gameState, entity.getId());
  }

  gameState.entities.push(entity);
  gameState.entityMap.set(entity.getId(), entity);
  
  // Add to type-based map
  const entityType = entity.getType();
  if (!gameState.entitiesByType.has(entityType)) {
    gameState.entitiesByType.set(entityType, []);
  }
  gameState.entitiesByType.get(entityType)!.push(entity);
}

/**
 * Helper function to remove an entity from both the array and map
 */
export function removeEntity(gameState: GameState, id: number): void {
  const entity = gameState.entityMap.get(id);
  if (entity) {
    const index = gameState.entities.findIndex((e) => e.getId() === id);
    if (index !== -1) {
      gameState.entities.splice(index, 1);
    }
    gameState.entityMap.delete(id);
    
    // Remove from type-based map
    const entityType = entity.getType();
    const typeEntities = gameState.entitiesByType.get(entityType);
    if (typeEntities) {
      const typeIndex = typeEntities.indexOf(entity);
      if (typeIndex > -1) {
        typeEntities.splice(typeIndex, 1);
      }
      // Clean up empty arrays
      if (typeEntities.length === 0) {
        gameState.entitiesByType.delete(entityType);
      }
    }
  }
}

/**
 * Helper function to clear all entities from both the array and map
 */
export function clearEntities(gameState: GameState): void {
  gameState.entities = [];
  gameState.entityMap.clear();
  gameState.entitiesByType.clear();
}

/**
 * Helper function to replace all entities (for full state updates)
 */
export function replaceAllEntities(gameState: GameState, entities: ClientEntityBase[]): void {
  gameState.entities = entities;
  gameState.entityMap.clear();
  gameState.entitiesByType.clear();
  entities.forEach((entity) => {
    gameState.entityMap.set(entity.getId(), entity);
    
    // Add to type-based map
    const entityType = entity.getType();
    if (!gameState.entitiesByType.has(entityType)) {
      gameState.entitiesByType.set(entityType, []);
    }
    gameState.entitiesByType.get(entityType)!.push(entity);
  });
}
