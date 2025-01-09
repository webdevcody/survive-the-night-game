import { distance, isColliding, Vector2 } from "../shared/physics";
import { Entities, Entity, GenericEntity } from "../shared/entities";
import { Hitbox } from "../shared/traits";
import { Player } from "../shared/entities/player";
import { SpatialGrid } from "./spatial-grid";
import { Collidable, Destructible, Positionable, Updatable } from "../shared/extensions";
import { InventoryItem, ItemType } from "../shared/inventory";
import { Broadcaster } from "./server-socket-manager";
import { EntityType } from "../shared/entity-types";
import { Gasoline } from "../shared/entities/items/gasoline";
import { Bandage } from "../shared/entities/items/bandage";
import { Torch } from "../shared/entities/items/torch";
import { Cloth } from "../shared/entities/items/cloth";
import { Tree } from "../shared/entities/items/tree";
import { Wall } from "../shared/entities/items/wall";
import { Spikes } from "../shared/entities/items/spikes";
import { Weapon } from "../shared/entities/weapon";

type EntityConstructor = new (entityManager: EntityManager, ...args: any[]) => Entity;
type EntityFactory = (entityManager: EntityManager) => Entity;

export class EntityManager {
  private entities: Entity[];
  private entitiesToRemove: Array<{ id: string; expiration: number }> = [];
  private id: number = 0;
  private spatialGrid: SpatialGrid | null = null;
  private broadcaster: Broadcaster;
  private itemConstructors = new Map<ItemType, EntityConstructor | EntityFactory>();

  constructor(broadcaster: Broadcaster) {
    this.entities = [];
    this.broadcaster = broadcaster;
    this.registerDefaultItems();
  }

  private registerDefaultItems() {
    // Register all available item types upfront
    this.registerItem("gasoline", Gasoline);
    this.registerItem("bandage", Bandage);
    this.registerItem("torch", Torch);
    this.registerItem("cloth", Cloth);
    this.registerItem("wood", Tree);
    this.registerItem("wall", Wall);
    this.registerItem("spikes", Spikes);

    // Register weapons
    this.registerItem("knife", (em: EntityManager) => new Weapon(em, "knife"));
    this.registerItem("shotgun", (em: EntityManager) => new Weapon(em, "shotgun"));
    this.registerItem("pistol", (em: EntityManager) => new Weapon(em, "pistol"));
  }

  public registerItem(type: ItemType, constructor: EntityConstructor | EntityFactory): void {
    if (!this.itemConstructors.has(type)) {
      this.itemConstructors.set(type, constructor);
    }
  }

  public hasRegisteredItem(type: ItemType): boolean {
    return this.itemConstructors.has(type);
  }

  public createEntityFromItem(item: InventoryItem): Entity {
    const constructor = this.itemConstructors.get(item.key);
    if (!constructor) {
      throw new Error(`Unknown item type: '${item.key}'`);
    }

    if (typeof constructor === "function" && !constructor.prototype) {
      // It's a factory function
      return (constructor as EntityFactory)(this);
    } else {
      // It's a constructor
      return new (constructor as EntityConstructor)(this);
    }
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

  getEntitiesToRemove(): Array<{ id: string; expiration: number }> {
    return this.entitiesToRemove;
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

  // TODO: we might benefit from abstracting this into a more generic function that takes in a type or something
  getNearbyIntersectingDestructableEntities(sourceEntity: Entity, sourceHitbox: Hitbox) {
    if (!this.spatialGrid) {
      return [];
    }

    const hitBox = sourceHitbox;

    const nearbyEntities = this.spatialGrid.getNearbyEntities(hitBox);

    const interactingEntities: Entity[] = [];

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
        interactingEntities.push(otherEntity);
      }
    }

    return interactingEntities;
  }

  /**
   * This function will return the first entity that intersects with the source entity, but it requires
   * that the entity has a method with the name of the functionIdentifier.
   */
  getIntersectingCollidableEntity(sourceEntity: Entity, ignoreTypes?: EntityType[]): Entity | null {
    if (!this.spatialGrid) {
      return null;
    }

    const hitBox = sourceEntity.getExt(Collidable).getHitBox();

    const nearbyEntities = this.spatialGrid.getNearbyEntities(hitBox);

    // TODO: look into refactoring this
    for (const otherEntity of nearbyEntities) {
      if (ignoreTypes && ignoreTypes.includes(otherEntity.getType())) {
        continue;
      }

      const isCollidable = otherEntity.hasExt(Collidable);

      if (!isCollidable) {
        continue;
      }

      if (!otherEntity.getExt(Collidable).isEnabled()) {
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
    return this.getIntersectingCollidableEntity(sourceEntity, ignoreTypes);
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

  public getBroadcaster(): Broadcaster {
    return this.broadcaster;
  }
}
