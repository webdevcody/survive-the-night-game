import { ClientEntityBase } from "@/extensions/client-entity";
import type { WorldMapQuestDefinition } from "@shared/map/quest-types";
import type { QuestNavigationTarget } from "@shared/quests/quest-navigation-need";
import { EntityType } from "@shared/types/entity";
import { GameModeId } from "@shared/events/server-sent/events/game-started-event";
import { addEntityToTypeMap, removeEntityFromTypeMap } from "@shared/util/entity-map-helpers";

export type GameState = {
  startedAt: number;
  playerId: number;
  entities: ClientEntityBase[];
  entityMap: Map<number, ClientEntityBase>;
  entitiesByType: Map<EntityType, ClientEntityBase[]>;
  gameMode: GameModeId;
  phaseStartTime: number;
  phaseDuration: number;
  totalZombies?: number;
  crafting: boolean;
  serverTimeOffset: number;
  closestInteractiveEntityId?: number | null;
  /** When set, client shows speech bubble for this dialogue_survivor_npc entity id. */
  openDialogueNpcId?: number | null;
  /** 0-based index into current NPC dialogue lines (client-only). */
  dialogueLineIndex: number;
   /** Set by client each tick for dialogue branches that need authored quest step counts. */
  getQuestStepCount?: (questId: string) => number | undefined;
  getQuestDefinition?: (questId: string) => WorldMapQuestDefinition | undefined;
  /**
   * Filled each tick from the first active quest (same as the on-screen tracker).
   * Used by HUD edge arrows, map pins, and NPC highlight markers.
   */
  questNavigationTarget?: QuestNavigationTarget | null;
  dt: number;
  globalIlluminationMultiplier: number;
  darknessHue: "red" | "blue";
};

export function getEntityById(gameState: GameState, id: number): ClientEntityBase | undefined {
  return gameState.entityMap.get(id);
}

export function getEntitiesByType(gameState: GameState, type: EntityType): ClientEntityBase[] {
  return gameState.entitiesByType.get(type) ?? [];
}

export function addEntity(gameState: GameState, entity: ClientEntityBase): void {
  if (gameState.entityMap.has(entity.getId())) {
    console.warn(`[Client] addEntity called for existing ID ${entity.getId()}. removing old entity.`);
    removeEntity(gameState, entity.getId());
  }

  gameState.entities.push(entity);
  gameState.entityMap.set(entity.getId(), entity);

  addEntityToTypeMap(entity, gameState.entitiesByType);
}

export function removeEntity(gameState: GameState, id: number): void {
  const entity = gameState.entityMap.get(id);
  if (entity) {
    const index = gameState.entities.findIndex((e) => e.getId() === id);
    if (index !== -1) {
      gameState.entities.splice(index, 1);
    }
    gameState.entityMap.delete(id);

    removeEntityFromTypeMap(entity, gameState.entitiesByType);
  }
}

export function clearEntities(gameState: GameState): void {
  gameState.entities = [];
  gameState.entityMap.clear();
  gameState.entitiesByType.clear();
}

export function replaceAllEntities(gameState: GameState, entities: ClientEntityBase[]): void {
  gameState.entities = entities;
  gameState.entityMap.clear();
  gameState.entitiesByType.clear();
  entities.forEach((entity) => {
    gameState.entityMap.set(entity.getId(), entity);

    addEntityToTypeMap(entity, gameState.entitiesByType);
  });
}
