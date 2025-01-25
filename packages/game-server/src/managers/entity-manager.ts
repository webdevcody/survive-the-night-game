import { Zombie } from "@/entities/enemies/zombie";
import { BigZombie } from "@/entities/enemies/big-zombie";
import { FastZombie } from "@/entities/enemies/fast-zombie";
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
import { Entities, Zombies } from "@/constants";
import { Entity } from "@/entities/entity";
import { ItemType, InventoryItem } from "@/util/inventory";
import { distance } from "@/util/physics";
import { IEntity } from "@/entities/types";
import { EntityType } from "@shared/types/entity";
import { EntityFinder } from "@/managers/entity-finder";
import { IGameManagers, IEntityManager, Broadcaster } from "@/managers/types";
import { Landmine } from "@/entities/items/landmine";
import { EntityStateTracker } from "./entity-state-tracker";
import Shape, { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { Grenade } from "@/entities/items/grenade";
import { FireExtinguisher } from "@/entities/items/fire-extinguisher";
import Groupable from "@/extensions/groupable";
import { BaseEnemy } from "@/entities/enemies/base-enemy";
import { Boundary } from "@/entities/environment/boundary";

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
  [Entities.BIG_ZOMBIE]: BigZombie,
  [Entities.FAST_ZOMBIE]: FastZombie,
  [Entities.LANDMINE]: Landmine,
  [Entities.GRENADE]: Grenade,
  [Entities.FIRE_EXTINGUISHER]: FireExtinguisher,
};

type EntityConstructor = new (entityManager: IGameManagers, ...args: any[]) => Entity;

export class EntityManager implements IEntityManager {
  private entities: Entity[];
  private players: Player[];
  private entitiesToRemove: Array<{ id: string; expiration: number }> = [];
  private id: number = 0;
  private entityFinder: EntityFinder | null = null;
  private gameManagers?: IGameManagers;
  private itemConstructors = new Map<ItemType, EntityConstructor>();
  private entityStateTracker: EntityStateTracker;
  private dynamicEntities: Entity[];

  constructor() {
    this.entities = [];
    this.players = [];
    this.dynamicEntities = [];
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
    this.registerItem("grenade", Grenade);
    this.registerItem("fire_extinguisher", FireExtinguisher);

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
    const constructor = this.itemConstructors.get(item.itemType);
    if (!constructor) {
      throw new Error(`Unknown item type: '${item.itemType}'`);
    }

    return new (constructor as EntityConstructor)(this.getGameManagers(), item.state);
  }

  setMapSize(width: number, height: number) {
    this.entityFinder = new EntityFinder(width, height);
  }

  addEntity(entity: Entity) {
    this.entities.push(entity);
    if (entity.getType() === Entities.PLAYER) {
      this.players.push(entity as Player);
    }

    this.entityFinder?.addEntity(entity);
    if (!(entity instanceof Boundary)) {
      this.dynamicEntities.push(entity);
    }
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

    // Filter out records that haven't expired yet
    const expiredRecords = this.entitiesToRemove.filter((record) => now >= record.expiration);

    for (const record of expiredRecords) {
      // Find the entity index once
      const entityIndex = this.entities.findIndex((entity) => entity.getId() === record.id);
      if (entityIndex === -1) continue;

      const entity = this.entities[entityIndex];

      // Track entity removal before removing it
      this.entityStateTracker.trackRemoval(record.id);

      // Remove from entities array
      this.entities.splice(entityIndex, 1);

      // Remove from players array if needed
      if (entity.getType() === Entities.PLAYER) {
        const playerIndex = this.players.findIndex((player) => player.getId() === record.id);
        if (playerIndex !== -1) {
          this.players.splice(playerIndex, 1);
        }
      }

      // Remove from dynamic entities
      if (!(entity instanceof Boundary)) {
        const dynamicIndex = this.dynamicEntities.findIndex((e) => e.getId() === record.id);
        if (dynamicIndex !== -1) {
          this.dynamicEntities.splice(dynamicIndex, 1);
        }
      }
    }

    // Update entitiesToRemove to only keep unexpired records
    this.entitiesToRemove = this.entitiesToRemove.filter((it) => now < it.expiration);
  }

  clear() {
    this.entities = [];
    this.players = [];
    this.dynamicEntities = [];
  }

  getNearbyEnemies(position: Vector2): Entity[] {
    if (!this.entityFinder) {
      return [];
    }

    const entities = this.entityFinder.getNearbyEntities(position);
    return entities.filter(
      (entity) => entity.hasExt(Groupable) && entity.getExt(Groupable).getGroup() === "enemy"
    );
  }

  getNearbyEntities(position: Vector2, radius: number = 64, filter?: EntityType[]): Entity[] {
    return this.entityFinder?.getNearbyEntities(position, radius, filter) ?? [];
  }

  getNearbyEntitiesByRange(range: Shape, filter?: EntityType[]): Entity[] {
    return this.entityFinder?.getNearbyEntitiesByRange(range, filter) ?? [];
  }

  getDynamicEntities(): Entity[] {
    return this.dynamicEntities;
  }

  getPlayerEntities(): Player[] {
    return this.players;
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

  getClosestAlivePlayer(entity: Entity, attackRange?: number): Player | null {
    if (!entity.hasExt(Positionable)) {
      return null;
    }

    if (this.players.length === 0) {
      return null;
    }

    const entityPosition = entity.getExt(Positionable).getPosition();
    let closestPlayer: Player | null = null;
    let closestPlayerDistance = Infinity;

    for (const player of this.players) {
      if (player.isDead()) continue;

      const playerDistance = distance(entityPosition, player.getPosition());

      // Skip if player is outside attack range
      if (attackRange && playerDistance > attackRange) continue;

      if (playerDistance < closestPlayerDistance) {
        closestPlayer = player;
        closestPlayerDistance = playerDistance;
      }
    }

    return closestPlayer;
  }

  // TODO: we might benefit from abstracting this into a more generic function that takes in a type or something
  getNearbyIntersectingDestructableEntities(sourceEntity: Entity, sourceHitbox: Rectangle) {
    if (!this.entityFinder) {
      return [];
    }

    const hitBox = sourceHitbox;

    const nearbyEntities = this.entityFinder.getNearbyEntitiesByRange(hitBox);

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

      if (hitBox.intersects(targetBox)) {
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
    if (!this.entityFinder) {
      return null;
    }

    const hitBox = sourceEntity.getExt(Collidable).getHitBox();
    const nearbyEntities = this.entityFinder.getNearbyEntitiesByRange(hitBox);

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

      if (hitBox.intersects(targetBox)) {
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

    const entities = this.getEntities();
    for (let i = 0; i < entities.length; i++) {
      const extensions = entities[i].getExtensions();
      const len = extensions.length;
      for (let j = 0; j < len; j++) {
        extensions[j]?.update?.(deltaTime);
      }
    }
  }

  private refreshSpatialGrid() {
    if (!this.entityFinder) {
      return;
    }

    // Clear the existing grid
    this.entityFinder.clear();

    // Re-add all entities that have a position
    const entities = this.getDynamicEntities();
    const len = entities.length;
    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      this.entityFinder!.addEntity(entity);
    }
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

  getZombieEntities(): BaseEnemy[] {
    return this.entities.filter((entity) => Zombies.includes(entity.getType())) as BaseEnemy[];
  }
}
