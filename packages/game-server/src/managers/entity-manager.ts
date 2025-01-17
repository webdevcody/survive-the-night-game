import { Zombie } from "@/entities/enemies/zombie";
import { Fire } from "@/entities/environment/fire";
import { Bandage } from "@/entities/items/bandage";
import { Cloth } from "@/entities/items/cloth";
import { Gasoline } from "@/entities/items/gasoline";
import { PistolAmmo } from "@/entities/items/pistol-ammo";
import { ShotgunAmmo } from "@/entities/items/shotgun-ammo";
import { Spikes } from "@/entities/items/spikes";
import { Torch } from "@/entities/items/torch";
import { Tree } from "@/entities/items/tree";
import { Wall } from "@/entities/items/wall";
import { Player } from "@/entities/player";
import { Bullet } from "@/entities/projectiles/bullet";
import { Knife } from "@/entities/weapons/knife";
import { Pistol } from "@/entities/weapons/pistol";
import { Shotgun } from "@/entities/weapons/shotgun";
import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Positionable from "@/extensions/positionable";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import { Hitbox } from "@/util/hitbox";
import { ItemType, InventoryItem } from "@/util/inventory";
import { Vector2, distance, isColliding } from "@/util/physics";
import { IEntity } from "@/entities/types";
import { EntityType } from "@shared/types/entity";
import { SpatialGrid } from "@/managers/spatial-grid";
import { IGameManagers, IEntityManager, Broadcaster } from "@/managers/types";
import { Landmine } from "@/entities/items/landmine";
import { EntityStateTracker } from "./entity-state-tracker";

const entityMap = {
  [Entities.PLAYER]: Player,
  [Entities.TREE]: Tree,
  [Entities.BULLET]: Bullet,
  [Entities.WALL]: Wall,
  [Entities.PISTOL]: Pistol,
  [Entities.PISTOL_AMMO]: PistolAmmo,
  [Entities.SHOTGUN]: Shotgun,
  [Entities.SHOTGUN_AMMO]: ShotgunAmmo,
  [Entities.KNIFE]: Knife,
  [Entities.BANDAGE]: Bandage,
  [Entities.CLOTH]: Cloth,
  [Entities.SPIKES]: Spikes,
  [Entities.FIRE]: Fire,
  [Entities.TORCH]: Torch,
  [Entities.GASOLINE]: Gasoline,
  [Entities.ZOMBIE]: Zombie,
  [Entities.LANDMINE]: Landmine,
};

type EntityConstructor = new (entityManager: IGameManagers, ...args: any[]) => Entity;

export class EntityManager implements IEntityManager {
  private entities: Entity[];
  private entitiesToRemove: Array<{ id: string; expiration: number }> = [];
  private id: number = 0;
  private spatialGrid: SpatialGrid | null = null;
  private gameManagers?: IGameManagers;
  private itemConstructors = new Map<ItemType, EntityConstructor>();
  private entityStateTracker: EntityStateTracker;

  constructor() {
    this.entities = [];
    this.entityStateTracker = new EntityStateTracker();
    this.registerDefaultItems();
  }

  setGameManagers(gameManagers: IGameManagers) {
    this.gameManagers = gameManagers;
  }

  getGameManagers(): IGameManagers {
    if (!this.gameManagers) {
      throw new Error("GameManagers not set");
    }
    return this.gameManagers;
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
    this.registerItem("knife", Knife);
    this.registerItem("shotgun", Shotgun);
    this.registerItem("pistol", Pistol);

    // Register ammo
    this.registerItem("pistol_ammo", PistolAmmo);
    this.registerItem("shotgun_ammo", ShotgunAmmo);

    // Register landmine
    this.registerItem("landmine", Landmine);
  }

  public registerItem(type: ItemType, constructor: any): void {
    if (!this.itemConstructors.has(type)) {
      this.itemConstructors.set(type, constructor);
    }
  }

  public getEntityById(id: string): Entity | null {
    return this.entities.find((entity) => entity.getId() === id) ?? null;
  }

  public hasRegisteredItem(type: ItemType): boolean {
    return this.itemConstructors.has(type);
  }

  public createEntityFromItem(item: InventoryItem): Entity {
    const constructor = this.itemConstructors.get(item.key);
    if (!constructor) {
      throw new Error(`Unknown item type: '${item.key}'`);
    }

    return new (constructor as EntityConstructor)(this.getGameManagers());
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

      // Track entity removal before removing it
      this.entityStateTracker.trackRemoval(entity.getId());
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
    this.refreshSpatialGrid();

    for (const entity of this.getEntities()) {
      this.updateExtensions(entity, deltaTime);
    }
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
    return this.getGameManagers().getBroadcaster();
  }

  createEntity(entityType: EntityType): IEntity | null {
    const entityConstructor = (entityMap as any)[entityType];
    if (entityConstructor) {
      return new entityConstructor(this.getGameManagers());
    } else {
      console.warn(`createEntity failed - Unknown entity type: ${entityType}`);
      return null;
    }
  }

  public getEntityStateTracker(): EntityStateTracker {
    return this.entityStateTracker;
  }
}
