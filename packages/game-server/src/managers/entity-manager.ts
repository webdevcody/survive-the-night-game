import { distance, isColliding, Vector2 } from "../shared/physics";
import { Entities, Entity, EntityType } from "../shared/entities";
import {
  Collidable,
  Damageable,
  Interactable,
  InteractableKey,
  IntersectionMethodIdentifiers,
  IntersectionMethodName,
  Positionable,
  Updatable,
} from "../shared/traits";
import { Player } from "../shared/entities/player";
import { SpatialGrid } from "./spatial-grid";

export class EntityManager {
  private entities: Entity[];
  private entitiesToRemove: Array<{ id: string; expiration: number }> = [];
  private id: number = 0;
  private spatialGrid: SpatialGrid | null = null;

  constructor() {
    this.entities = [];
  }

  setMapSize(width: number, height: number) {
    this.spatialGrid = new SpatialGrid(width, height);
  }

  addEntity(entity: Entity) {
    this.entities.push(entity);
  }

  getEntities(): Entity[] {
    return this.entities;
  }

  getUpdatableEntities(): Updatable[] {
    return this.entities.filter((entity) => {
      return "update" in entity;
    }) as unknown as Updatable[];
  }

  markEntityForRemoval(entity: Entity, expiration = 0) {
    this.entitiesToRemove.push({
      id: entity.getId(),
      expiration: Date.now() + expiration,
    });
  }

  generateEntityId(): string {
    return `${this.id++}`;
  }

  pruneEntities() {
    const now = Date.now();

    if (this.entities.length === 0 || this.entitiesToRemove.length === 0) {
      return;
    }

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      const removeRecordIndex = this.entitiesToRemove.findIndex((it) => it.id === entity.getId());

      if (removeRecordIndex === -1) {
        continue;
      }

      const removeRecord = this.entitiesToRemove[removeRecordIndex];

      if (now < removeRecord.expiration) {
        continue;
      }

      this.entities.splice(i, 1);
      this.entitiesToRemove.splice(removeRecordIndex, 1);
    }
  }

  clear() {
    this.entities = [];
  }

  addEntities(entities: Entity[]) {
    this.entities.push(...entities);
  }

  getNearbyEntities(position: Vector2, radius?: number, filter?: EntityType[]): Entity[] {
    return this.spatialGrid?.getNearbyEntities(position, radius, filter) ?? [];
  }

  getPositionableEntities(): Positionable[] {
    return this.entities.filter((entity) => {
      return "getPosition" in entity;
    }) as unknown as Positionable[];
  }

  getPlayerEntities(): Player[] {
    return this.entities.filter((entity) => {
      return entity.getType() === Entities.PLAYER;
    }) as unknown as Player[];
  }

  filterInteractableEntities(entities: Entity[]): Interactable[] {
    return entities.filter((entity) => {
      return InteractableKey in entity;
    }) as unknown as Interactable[];
  }

  getCollidableEntities(): Collidable[] {
    return this.entities.filter((entity) => {
      return "getHitbox" in entity;
    }) as unknown as Collidable[];
  }

  getClosestPlayer(entity: Positionable): Player | null {
    const players = this.getPlayerEntities();

    if (players.length === 0) {
      return null;
    }

    const entityPosition = entity.getPosition();
    let closestPlayerIdx = 0;
    let closestPlayerDistance = distance(entityPosition, players[closestPlayerIdx].getPosition());

    for (let i = 1; i < players.length; i++) {
      const player = players[i];
      const playerDistance = distance(entityPosition, player.getPosition());

      if (playerDistance < closestPlayerDistance) {
        closestPlayerIdx = i;
        closestPlayerDistance = playerDistance;
      }
    }

    return players[closestPlayerIdx];
  }

  getClosestAlivePlayer(entity: Positionable): Player | null {
    const players = this.getPlayerEntities().filter((player) => !player.isDead());

    if (players.length === 0) {
      return null;
    }

    const entityPosition = entity.getPosition();
    let closestPlayerIdx = 0;
    let closestPlayerDistance = distance(entityPosition, players[closestPlayerIdx].getPosition());

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const playerDistance = distance(entityPosition, player.getPosition());

      if (playerDistance < closestPlayerDistance && !player.isDead()) {
        closestPlayerIdx = i;
        closestPlayerDistance = playerDistance;
      }
    }

    return players[closestPlayerIdx];
  }

  /**
   * This function will return the first entity that intersects with the source entity, but it requires
   * that the entity has a method with the name of the functionIdentifier.
   */
  getIntersectingEntityByType(
    sourceEntity: Collidable,
    functionIdentifier: IntersectionMethodName,
    ignoreTypes?: EntityType[]
  ): Collidable | Damageable | null {
    if (!this.spatialGrid) {
      return null;
    }

    const nearbyEntities = this.spatialGrid.getNearbyEntities(sourceEntity.getPosition());
    for (const otherEntity of nearbyEntities) {
      if (ignoreTypes && ignoreTypes.includes(otherEntity.getType())) {
        continue;
      }

      const intersectionMethod = otherEntity[functionIdentifier] as any;
      if (intersectionMethod) {
        const targetEntity = otherEntity as unknown as Collidable;

        if (targetEntity === sourceEntity || ("isDead" in targetEntity && targetEntity.isDead())) {
          continue;
        }

        if (isColliding(sourceEntity.getHitbox(), intersectionMethod.call(targetEntity))) {
          return targetEntity;
        }
      }
    }

    return null;
  }

  isColliding(sourceEntity: Collidable, ignoreTypes?: EntityType[]): Collidable | null {
    return this.getIntersectingEntityByType(
      sourceEntity,
      IntersectionMethodIdentifiers.Collidable,
      ignoreTypes
    ) as Collidable | null;
  }

  isDamaging(sourceEntity: Collidable, ignoreTypes?: EntityType[]): Damageable | null {
    return this.getIntersectingEntityByType(
      sourceEntity,
      IntersectionMethodIdentifiers.Damageable,
      ignoreTypes
    ) as Damageable | null;
  }

  update(deltaTime: number) {
    for (const entity of this.getUpdatableEntities()) {
      entity.update(deltaTime);
    }

    // Then refresh the spatial grid
    this.refreshSpatialGrid();
  }

  private refreshSpatialGrid() {
    if (!this.spatialGrid) {
      return;
    }

    // Clear the existing grid
    this.spatialGrid.clear();

    // Re-add all entities that have a position
    this.entities.forEach((entity) => {
      if ("getPosition" in entity) {
        this.spatialGrid!.addEntity(entity);
      }
    });
  }
}
