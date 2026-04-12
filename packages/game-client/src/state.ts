import { ClientEntityBase } from "@/extensions/client-entity";
import type { WorldMapQuestDefinition } from "@shared/map/quest-types";
import type { QuestNavigationTarget } from "@shared/quests/quest-navigation-need";
import { EntityType } from "@shared/types/entity";
import { GameModeId } from "@shared/events/server-sent/events/game-started-event";
import { addEntityToTypeMap, removeEntityFromTypeMap } from "@shared/util/entity-map-helpers";

const EMPTY_ENTITIES = Object.freeze([]) as readonly ClientEntityBase[];

export class GameState {
  public startedAt = Date.now();
  public playerId = 0;
  public gameMode: GameModeId = "open_world";
  public phaseStartTime = Date.now();
  public phaseDuration = 0;
  public totalZombies?: number = 0;
  public crafting = false;
  public serverTimeOffset = 0;
  public closestInteractiveEntityId?: number | null;
  /** When set, client shows speech bubble for this dialogue_survivor_npc entity id. */
  public openDialogueNpcId?: number | null = null;
  /** 0-based index into current NPC dialogue lines (client-only). */
  public dialogueLineIndex = 0;
  /** Set by client each tick for dialogue branches that need authored quest step counts. */
  public getQuestStepCount?: (questId: string) => number | undefined;
  public getQuestDefinition?: (questId: string) => WorldMapQuestDefinition | undefined;
  /**
   * Filled each tick from the first active quest (same as the on-screen tracker).
   * Used by HUD edge arrows, map pins, and NPC highlight markers.
   */
  public questNavigationTarget?: QuestNavigationTarget | null;
  public dt = 0;
  public globalIlluminationMultiplier = 1.0;
  public darknessHue: "red" | "blue" = "red";

  private entities: ClientEntityBase[] = [];
  private readonly entityMap = new Map<number, ClientEntityBase>();
  private readonly entitiesByType = new Map<EntityType, ClientEntityBase[]>();

  public getEntities(): readonly ClientEntityBase[] {
    return this.entities;
  }

  public getEntitiesByType(type: EntityType): readonly ClientEntityBase[] {
    return this.entitiesByType.get(type) ?? EMPTY_ENTITIES;
  }

  public getEntityById(id: number): ClientEntityBase | undefined {
    return this.entityMap.get(id);
  }

  public hasEntity(id: number): boolean {
    return this.entityMap.has(id);
  }

  public addEntity(entity: ClientEntityBase): void {
    if (this.entityMap.has(entity.getId())) {
      console.warn(`[Client] addEntity called for existing ID ${entity.getId()}. removing old entity.`);
      this.removeEntity(entity.getId());
    }

    this.entities.push(entity);
    this.entityMap.set(entity.getId(), entity);
    addEntityToTypeMap(entity, this.entitiesByType);
  }

  public removeEntity(id: number): void {
    const entity = this.entityMap.get(id);
    if (!entity) {
      return;
    }

    const index = this.entities.findIndex((e) => e.getId() === id);
    if (index !== -1) {
      this.entities.splice(index, 1);
    }
    this.entityMap.delete(id);
    removeEntityFromTypeMap(entity, this.entitiesByType);
  }

  public clearEntities(): void {
    this.entities = [];
    this.entityMap.clear();
    this.entitiesByType.clear();
  }

  public replaceAllEntities(entities: readonly ClientEntityBase[]): void {
    this.entities = [...entities];
    this.entityMap.clear();
    this.entitiesByType.clear();
    for (const entity of this.entities) {
      this.entityMap.set(entity.getId(), entity);
      addEntityToTypeMap(entity, this.entitiesByType);
    }
  }
}

export function getEntityById(gameState: GameState, id: number): ClientEntityBase | undefined {
  return gameState.getEntityById(id);
}

export function getEntitiesByType(gameState: GameState, type: EntityType): readonly ClientEntityBase[] {
  return gameState.getEntitiesByType(type);
}

export function addEntity(gameState: GameState, entity: ClientEntityBase): void {
  gameState.addEntity(entity);
}

export function removeEntity(gameState: GameState, id: number): void {
  gameState.removeEntity(id);
}

export function clearEntities(gameState: GameState): void {
  gameState.clearEntities();
}

export function replaceAllEntities(gameState: GameState, entities: readonly ClientEntityBase[]): void {
  gameState.replaceAllEntities(entities);
}
