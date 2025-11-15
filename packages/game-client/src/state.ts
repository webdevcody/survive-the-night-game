import { ClientEntityBase } from "@/extensions/client-entity";
import { WaveState } from "@shared/types/wave";

export type GameState = {
  startedAt: number;
  playerId: string;
  entities: ClientEntityBase[];
  entityMap: Map<string, ClientEntityBase>;
  // Legacy day/night cycle (deprecated)
  dayNumber: number;
  cycleStartTime: number;
  cycleDuration: number;
  isDay: boolean;
  // Wave system
  waveNumber: number;
  waveState: WaveState;
  phaseStartTime: number;
  phaseDuration: number;
  totalZombies?: number;
  crafting: boolean;
  // Server time synchronization
  serverTimeOffset: number; // Offset in milliseconds: clientTime - serverTime
};

export function getEntityById(gameState: GameState, id: string): ClientEntityBase | undefined {
  return gameState.entityMap.get(id);
}

/**
 * Helper function to add an entity to both the array and map
 */
export function addEntity(gameState: GameState, entity: ClientEntityBase): void {
  gameState.entities.push(entity);
  gameState.entityMap.set(entity.getId(), entity);
}

/**
 * Helper function to remove an entity from both the array and map
 */
export function removeEntity(gameState: GameState, id: string): void {
  const index = gameState.entities.findIndex((entity) => entity.getId() === id);
  if (index !== -1) {
    gameState.entities.splice(index, 1);
  }
  gameState.entityMap.delete(id);
}

/**
 * Helper function to clear all entities from both the array and map
 */
export function clearEntities(gameState: GameState): void {
  gameState.entities = [];
  gameState.entityMap.clear();
}

/**
 * Helper function to replace all entities (for full state updates)
 */
export function replaceAllEntities(gameState: GameState, entities: ClientEntityBase[]): void {
  gameState.entities = entities;
  gameState.entityMap.clear();
  entities.forEach((entity) => {
    gameState.entityMap.set(entity.getId(), entity);
  });
}
