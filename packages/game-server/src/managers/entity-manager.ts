import { distance, isColliding, Vector2 } from "../shared/physics";
import { Entities, Entity, EntityType, GenericEntity } from "../shared/entities";
import {
  CollidableTrait,
  Damageable,
  Interactable,
  InteractableKey,
  IntersectionMethodIdentifiers,
  IntersectionMethodName,
  PositionableTrait,
} from "../shared/traits";
import { Player } from "../shared/entities/player";
import { SpatialGrid } from "./spatial-grid";
import { Collidable, Destructible, Positionable, Updatable } from "@/shared/extensions";

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

      const removeRecordIndex = this.entitiesToRemove.findLastIndex(
        (it) => it.id === entity.getId()
      );

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

    this.entitiesToRemove = this.entitiesToRemove.filter((it) => now < it.expiration);
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

  getPositionableEntities(): PositionableTrait[] {
    return this.entities.filter((entity) => {
      return "getPosition" in entity;
    }) as unknown as PositionableTrait[];
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

  getCollidableEntities(): CollidableTrait[] {
    return this.entities.filter((entity) => {
      return "getHitbox" in entity || entity.hasExt(Collidable);
    }) as unknown as CollidableTrait[];
  }

  getClosestPlayer(entity: PositionableTrait): Player | null {
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

  getClosestAlivePlayer(entity: PositionableTrait): Player | null {
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
    sourceEntity: Entity,
    functionIdentifier: IntersectionMethodName,
    ignoreTypes?: EntityType[]
  ): Entity | null {
    if (!this.spatialGrid) {
      return null;
    }

    const hitBox =
      "getHitbox" in sourceEntity
        ? sourceEntity.getHitbox()
        : sourceEntity.getExt(Collidable).getHitBox();

    const nearbyEntities = this.spatialGrid.getNearbyEntities(hitBox);

    for (const otherEntity of nearbyEntities) {
      if (ignoreTypes && ignoreTypes.includes(otherEntity.getType())) {
        continue;
      }

      const hasMethod =
        functionIdentifier === "getDamageBox"
          ? "getDamageBox" in otherEntity || otherEntity.hasExt(Destructible)
          : "getHitbox" in otherEntity || otherEntity.hasExt(Collidable);

      if (!hasMethod) {
        continue;
      }

      const targetBox =
        functionIdentifier === "getDamageBox"
          ? "getDamageBox" in otherEntity
            ? otherEntity.getDamageBox()
            : otherEntity.getExt(Destructible).getDamageBox()
          : "getHitbox" in otherEntity
          ? otherEntity.getHitbox()
          : otherEntity.getExt(Collidable).getHitBox();

      const dead =
        ("isDead" in otherEntity && otherEntity.isDead()) ||
        (otherEntity.hasExt(Destructible) && otherEntity.getExt(Destructible).isDead());

      if (otherEntity === sourceEntity || dead) {
        continue;
      }

      if (isColliding(hitBox, targetBox)) {
        return otherEntity;
      }
    }

    return null;
  }

  isColliding(sourceEntity: Entity, ignoreTypes?: EntityType[]): CollidableTrait | null {
    return this.getIntersectingEntityByType(
      sourceEntity,
      IntersectionMethodIdentifiers.Collidable,
      ignoreTypes
    ) as CollidableTrait | null;
  }

  isDamaging(sourceEntity: Entity, ignoreTypes?: EntityType[]): Damageable | null {
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

    // TODO: if we refactor all other entities to use extensions, we can remove the above
    for (const entity of this.getEntities()) {
      if ("getExt" in entity) {
        const baseEntity = entity as unknown as GenericEntity;
        if (baseEntity.hasExt(Updatable)) {
          const updatable = baseEntity.getExt(Updatable);
          updatable?.update(deltaTime);
        }
      }
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
      if ("getPosition" in entity || entity.hasExt(Positionable)) {
        this.spatialGrid!.addEntity(entity);
      }
    });
  }
}
