import { distance, isColliding, Vector2 } from "../shared/physics";
import { Entities, Entity, GenericEntity } from "../shared/entities";
import { Hitbox } from "../shared/traits";
import { Player } from "../shared/entities/player";
import { SpatialGrid } from "./spatial-grid";
import { Collidable, Destructible, Positionable, Updatable } from "@/shared/extensions";
import { InventoryItem } from "../shared/inventory";
import { Weapon } from "../shared/entities/weapon";
import { Tree } from "../shared/entities/tree";
import { Wall } from "../shared/entities/wall";
import { Bandage } from "../shared/entities/items/bandage";
import { Cloth } from "../shared/entities/items/cloth";
import { ServerSocketManager } from "./server-socket-manager";
import { EntityType } from "@/shared/entity-types";

export class EntityManager {
  private entities: Entity[];
  private entitiesToRemove: Array<{ id: string; expiration: number }> = [];
  private id: number = 0;
  private spatialGrid: SpatialGrid | null = null;
  private socketManager: ServerSocketManager;

  constructor(socketManager: ServerSocketManager) {
    this.entities = [];
    this.socketManager = socketManager;
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

  markEntityForRemoval(entity: GenericEntity, expiration = 0) {
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

  getNearbyEntities(position: Vector2, radius: number = 64, filter?: EntityType[]): Entity[] {
    return this.spatialGrid?.getNearbyEntities(position, radius, filter) ?? [];
  }

  getPlayerEntities(): Player[] {
    return this.entities.filter((entity) => {
      return entity.getType() === Entities.PLAYER;
    }) as unknown as Player[];
  }

  getClosestPlayer(entity: Entity): Player | null {
    if (!entity.hasExt(Positionable)) {
      return null;
    }

    const players = this.getPlayerEntities();

    if (players.length === 0) {
      return null;
    }

    const entityPosition = entity.getExt(Positionable).getPosition();
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

  getClosestAlivePlayer(entity: Entity): Player | null {
    if (!entity.hasExt(Positionable)) {
      return null;
    }

    const players = this.getPlayerEntities().filter((player) => !player.isDead());

    if (players.length === 0) {
      return null;
    }

    const entityPosition = entity.getExt(Positionable).getPosition();
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

  getIntersectingDestructableEntities(sourceEntity: Entity, sourceHitbox: Hitbox): Entity | null {
    if (!this.spatialGrid) {
      return null;
    }

    const hitBox = sourceHitbox;

    const nearbyEntities = this.spatialGrid.getNearbyEntities(hitBox);

    for (const otherEntity of nearbyEntities) {
      if (!otherEntity.hasExt(Destructible)) {
        continue;
      }

      const targetBox = otherEntity.getExt(Destructible).getDamageBox();

      const isDead = otherEntity.getExt(Destructible).isDead();

      if (otherEntity === sourceEntity || isDead) {
        continue;
      }

      if (isColliding(hitBox, targetBox)) {
        return otherEntity;
      }
    }

    return null;
  }

  /**
   * This function will return the first entity that intersects with the source entity, but it requires
   * that the entity has a method with the name of the functionIdentifier.
   */
  getIntersectingCollidableEntities(
    sourceEntity: Entity,
    ignoreTypes?: EntityType[]
  ): Entity | null {
    if (!this.spatialGrid) {
      return null;
    }

    const hitBox = sourceEntity.getExt(Collidable).getHitBox();

    const nearbyEntities = this.spatialGrid.getNearbyEntities(hitBox);

    for (const otherEntity of nearbyEntities) {
      if (ignoreTypes && ignoreTypes.includes(otherEntity.getType())) {
        continue;
      }

      const hasMethod = otherEntity.hasExt(Collidable);

      if (!hasMethod) {
        continue;
      }

      const targetBox = otherEntity.getExt(Collidable).getHitBox();

      if (otherEntity === sourceEntity) {
        continue;
      }

      if (isColliding(hitBox, targetBox)) {
        return otherEntity;
      }
    }

    return null;
  }

  isColliding(sourceEntity: Entity, ignoreTypes?: EntityType[]): Entity | null {
    return this.getIntersectingCollidableEntities(sourceEntity, ignoreTypes);
  }

  update(deltaTime: number) {
    // TODO: this might go away after refactoring old entities to new ECS system
    for (const entity of this.getUpdatableEntities()) {
      entity.update(deltaTime);
    }

    // all entities are made up of extensions, so we need to update them here
    for (const entity of this.getEntities()) {
      this.updateExtensions(entity, deltaTime);
    }

    this.refreshSpatialGrid();
  }

  // as of right now, just allow any extension to have an optional update method
  updateExtensions(entity: Entity, deltaTime: number) {
    for (const extension of entity.getExtensions()) {
      if ("update" in extension) {
        (extension as any).update(deltaTime);
      }
    }
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

  public createEntityFromItem(item: InventoryItem): Entity {
    let entity: Entity;
    switch (item.key) {
      case "Knife":
      case "Pistol":
      case "Shotgun":
        entity = new Weapon(this, item.key);
        break;
      case "Wood":
        entity = new Tree(this, this.socketManager);
        break;
      case "Wall":
        entity = new Wall(this, item.state?.health);
        break;
      case "Bandage":
        entity = new Bandage(this);
        break;
      case "Cloth":
        entity = new Cloth(this);
        break;
      default:
        throw new Error(`Unknown item type: '${item.key}'`);
    }
    return entity;
  }
}
