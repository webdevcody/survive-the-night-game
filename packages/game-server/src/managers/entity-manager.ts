import { distance, isColliding, Vector2 } from "../shared/physics";
import { Entities, Entity, EntityType } from "../shared/entities";
import {
  Collidable,
  Damageable,
  FunctionIdentifier,
  Harvestable,
  IntersectionMethodIdentifiers,
  IntersectionMethodName,
  Positionable,
  Updatable,
} from "../shared/traits";
import { Player } from "../shared/entities/player";
import { SpatialGrid } from "./spatial-grid";

export class EntityManager {
  private entities: Entity[];
  private entitiesToRemove: string[] = [];
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

  markEntityForRemoval(entity: Entity) {
    this.entitiesToRemove.push(entity.getId());
  }

  generateEntityId(): string {
    return `${this.id++}`;
  }

  pruneEntities() {
    this.entities = this.entities.filter((e) => !this.entitiesToRemove.includes(e.getId()));
    this.entitiesToRemove = [];
  }

  clear() {
    this.entities = [];
  }

  addEntities(entities: Entity[]) {
    this.entities.push(...entities);
  }

  getNearbyEntities(position: Vector2, radius: number): Entity[] {
    return this.getPositionableEntities().filter((entity) => {
      return distance(entity.getPosition(), position) <= radius;
    }) as unknown as Entity[];
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

  filterHarvestableEntities(entities: Entity[]): Harvestable[] {
    return entities.filter((entity) => {
      return "harvest" in entity;
    }) as unknown as Harvestable[];
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

        if (targetEntity === sourceEntity) {
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
