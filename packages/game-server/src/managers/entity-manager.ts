import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Positionable from "@/extensions/positionable";
import { Entities, Zombies } from "@/constants";
import { Entity } from "@/entities/entity";
import { ItemType, InventoryItem } from "@/util/inventory";
import { distance } from "@/util/physics";
import { IEntity } from "@/entities/types";
import { EntityType, ItemState } from "@shared/types/entity";
import { EntityFinder } from "@/managers/entity-finder";
import { IGameManagers, IEntityManager, Broadcaster } from "@/managers/types";
import { EntityStateTracker } from "./entity-state-tracker";
import Vector2 from "@/util/vector2";
import { BaseEnemy } from "@/entities/enemies/base-enemy";
import { getConfig } from "@/config";
import { entityOverrideRegistry } from "@/entities/entity-override-registry";
import { itemRegistry } from "@shared/entities";
import { GenericItemEntity } from "@/entities/items/generic-item-entity";
import { registerCustomEntities } from "@/entities/register-custom-entities";
import { Player } from "@/entities/player";
import { perfTimer } from "@shared/util/performance";
import { profiler } from "@/util/profiler";

// Register all custom entity classes at module load time
registerCustomEntities();

const STATIC_ENTITIES: EntityType[] = [Entities.BOUNDARY, Entities.CAR];

export class EntityManager implements IEntityManager {
  private entities: Entity[];
  private players: Player[];
  private zombies: BaseEnemy[] = [];
  private merchants: Entity[] = [];
  private entitiesToRemove: Array<{ id: string; expiration: number }> = [];
  private id: number = 0;
  private entityFinder: EntityFinder | null = null;
  private gameManagers?: IGameManagers;
  private entityStateTracker: EntityStateTracker;
  private dynamicEntities: Entity[] = [];
  private updatableEntities: Entity[] = []; // Entities that have extensions with update methods
  private dirtyEntities: Set<Entity> = new Set();
  private entitiesInGrid: Set<Entity> = new Set();
  private entitiesToAddToGrid: Set<Entity> = new Set();

  constructor() {
    this.entities = [];
    this.players = [];
    this.entityStateTracker = new EntityStateTracker();
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

  public getEntityById(id: string): Entity | null {
    return this.entities.find((entity) => entity.getId() === id) ?? null;
  }

  public hasRegisteredItem(type: ItemType): boolean {
    // Check if entity can be created (either via override registry or generic)
    return entityOverrideRegistry.has(type) || itemRegistry.has(type);
  }

  public getDynamicEntities(): Entity[] {
    return this.dynamicEntities;
  }

  public createEntityFromItem(item: InventoryItem): Entity | null {
    const entityType = item.itemType as EntityType;

    // First check override registry for custom entity classes
    const overrideConstructor = entityOverrideRegistry.get(entityType);
    if (overrideConstructor) {
      // Custom entities may accept itemState as second parameter
      // Try with state first, fallback to without if constructor doesn't accept it
      try {
        return new overrideConstructor(this.getGameManagers(), item.state);
      } catch (e) {
        // If constructor doesn't accept state, try without
        return new overrideConstructor(this.getGameManagers());
      }
    }

    // Fallback to generic entity generation from configs
    const genericEntity = this.createGenericEntityFromItem(entityType, item.state);
    if (genericEntity) {
      return genericEntity;
    }

    console.warn(`createEntityFromItem failed - Unknown item type: ${item.itemType}`);
    return null;
  }

  private createGenericEntityFromItem(entityType: EntityType, state?: ItemState): Entity | null {
    // Try to create from item registry
    const itemConfig = itemRegistry.get(entityType);
    if (itemConfig) {
      const entity = new GenericItemEntity(this.getGameManagers(), entityType, itemConfig);
      // Apply state if provided (e.g., health for destructible items)
      if (state?.health !== undefined && entity.hasExt(Destructible)) {
        entity.getExt(Destructible).setHealth(state.health);
      }
      return entity;
    }

    return null;
  }

  setMapSize(width: number, height: number) {
    this.entityFinder = new EntityFinder(width, height);
    // Clear tracking when map size changes
    this.dirtyEntities.clear();
    this.entitiesInGrid.clear();
    this.entitiesToAddToGrid.clear();
    // Mark all existing entities with Positionable to be added to the new grid
    for (const entity of this.entities) {
      if (entity.hasExt(Positionable)) {
        this.entitiesToAddToGrid.add(entity);
      }
    }
  }

  addEntity(entity: Entity) {
    this.entities.push(entity);
    if (entity.getType() === Entities.PLAYER) {
      this.players.push(entity as Player);
    }

    if (Zombies.includes(entity.getType())) {
      this.zombies.push(entity as BaseEnemy);
    }

    if (entity.getType() === Entities.MERCHANT) {
      this.merchants.push(entity);
    }

    const isDynamicEntity = !STATIC_ENTITIES.includes(entity.getType());
    if (isDynamicEntity) {
      this.dynamicEntities.push(entity);
    }

    // Track entities with updatable extensions
    if (entity.hasUpdatableExtensions()) {
      this.updatableEntities.push(entity);
    }

    // Register position change callback for entities with Positionable extension
    if (entity.hasExt(Positionable)) {
      const positionable = entity.getExt(Positionable);
      positionable.setOnPositionChange((changedEntity) => {
        this.dirtyEntities.add(changedEntity as Entity);
      });
      // Mark entity to be added to grid (if grid exists and entity isn't already in it)
      if (this.entityFinder && !this.entitiesInGrid.has(entity)) {
        this.entitiesToAddToGrid.add(entity);
      }
    }
  }

  getEntities(): Entity[] {
    return this.entities;
  }

  getEntitiesToRemove(): Array<{ id: string; expiration: number }> {
    return this.entitiesToRemove;
  }

  markEntityForRemoval(entity: Entity, expiration = 0) {
    entity.setMarkedForRemoval(true);
    this.entitiesToRemove.push({
      id: entity.getId(),
      expiration: Date.now() + expiration,
    });
  }

  removeEntity(entityId: string) {
    const entity = this.entities.find((it) => it.getId() === entityId);
    if (entity) {
      // Clean up tracking data
      this.dirtyEntities.delete(entity);
      this.entitiesInGrid.delete(entity);
      this.entitiesToAddToGrid.delete(entity);
      // Remove from updatable entities
      const updatableIndex = this.updatableEntities.indexOf(entity);
      if (updatableIndex > -1) {
        this.updatableEntities.splice(updatableIndex, 1);
      }

      // Remove from spatial grid if it's in there
      if (this.entityFinder && entity.hasExt(Positionable)) {
        this.entityFinder.removeEntity(entity);
      }
    }

    this.spliceWhere(this.players, (it) => it.getId() === entityId);
    this.spliceWhere(this.zombies, (it) => it.getId() === entityId);
    this.spliceWhere(this.merchants, (it) => it.getId() === entityId);
    this.spliceWhere(this.entities, (it) => it.getId() === entityId);
  }

  private spliceWhere(array: any[], predicate: (item: any) => boolean): void {
    for (let i = array.length - 1; i >= 0; i--) {
      if (predicate(array[i])) {
        array.splice(i, 1);
      }
    }
  }

  generateEntityId(): string {
    return `${this.id++}`;
  }

  isEntityMarkedForRemoval(entityId: string): boolean {
    return this.entitiesToRemove.some((it) => it.id === entityId);
  }

  pruneEntities() {
    const now = Date.now();

    if (this.dynamicEntities.length === 0 || this.entitiesToRemove.length === 0) {
      return;
    }

    const entitiesToRemoveMap = new Map<string, { id: string; expiration: number }>([]);
    for (const entity of this.entitiesToRemove) {
      entitiesToRemoveMap.set(entity.id, entity);
    }

    // First loop through dynamic entities since they're more likely to be removed
    for (let i = this.dynamicEntities.length - 1; i >= 0; i--) {
      const entity = this.dynamicEntities[i];
      const entityToRemove = entitiesToRemoveMap.get(entity.getId());

      if (!entityToRemove) {
        continue;
      }

      if (now < entityToRemove.expiration) {
        continue;
      }

      // Track entity removal before removing it
      this.entityStateTracker.trackRemoval(entity.getId());

      // Clean up spatial grid tracking data
      this.dirtyEntities.delete(entity);
      this.entitiesInGrid.delete(entity);
      this.entitiesToAddToGrid.delete(entity);

      // Remove from updatable entities
      const updatableIndex = this.updatableEntities.indexOf(entity);
      if (updatableIndex > -1) {
        this.updatableEntities.splice(updatableIndex, 1);
      }

      if (this.entityFinder && entity.hasExt(Positionable)) {
        this.entityFinder.removeEntity(entity);
      }

      // Clear collidable tile if this entity has Collidable extension
      // This ensures the minimap accurately reflects removed collidables
      // if (entity.hasExt(Collidable) && entity.hasExt(Positionable)) {
      //   const position = entity.getExt(Positionable).getPosition();
      //   const positionable = entity.getExt(Positionable);
      //   const size = positionable.getSize();
      //   const mapManager = this.getGameManagers().getMapManager();
      //   const collidablesLayer = mapManager.getCollidablesLayer();

      //   // Clear all tiles occupied by this entity (in case it's larger than one tile)
      //   const startTileX = Math.floor(position.x / getConfig().world.TILE_SIZE);
      //   const startTileY = Math.floor(position.y / getConfig().world.TILE_SIZE);
      //   const endTileX = Math.floor((position.x + size.x) / getConfig().world.TILE_SIZE);
      //   const endTileY = Math.floor((position.y + size.y) / getConfig().world.TILE_SIZE);

      //   for (let tileY = startTileY; tileY <= endTileY; tileY++) {
      //     for (let tileX = startTileX; tileX <= endTileX; tileX++) {
      //       if (collidablesLayer[tileY] && collidablesLayer[tileY][tileX] !== undefined) {
      //         collidablesLayer[tileY][tileX] = -1;
      //       }
      //     }
      //   }
      // }

      // Remove from dynamicEntities
      this.dynamicEntities.splice(i, 1);

      // Remove from main entities array
      const entityIndex = this.entities.findIndex((e) => e.getId() === entity.getId());
      if (entityIndex !== -1) {
        this.entities.splice(entityIndex, 1);
      }

      // Remove from players array if it's a player
      if (entity.getType() === Entities.PLAYER) {
        const playerIndex = this.players.findIndex((player) => player.getId() === entity.getId());
        if (playerIndex !== -1) {
          this.players.splice(playerIndex, 1);
        }
      }

      // Remove from zombies array if it's a zombie
      if (Zombies.includes(entity.getType())) {
        const zombieIndex = this.zombies.findIndex((zombie) => zombie.getId() === entity.getId());
        if (zombieIndex !== -1) {
          this.zombies.splice(zombieIndex, 1);
        }
      }

      // Remove from merchants array if it's a merchant
      if (entity.getType() === Entities.MERCHANT) {
        const merchantIndex = this.merchants.findIndex(
          (merchant) => merchant.getId() === entity.getId()
        );
        if (merchantIndex !== -1) {
          this.merchants.splice(merchantIndex, 1);
        }
      }
    }

    // Clean up expired entries from entitiesToRemove
    this.spliceWhere(this.entitiesToRemove, (it) => now < it.expiration);
  }

  clear() {
    this.entities = [];
    this.players = [];
    this.zombies = [];
    this.merchants = [];
    this.dynamicEntities = [];
    this.updatableEntities = [];
    this.dirtyEntities.clear();
    this.entitiesInGrid.clear();
    this.entitiesToAddToGrid.clear();
  }

  getNearbyEntities(position: Vector2, radius: number = 64, filter?: EntityType[]): Entity[] {
    const entities = this.entityFinder?.getNearbyEntities(position, radius, filter) ?? [];
    return entities.filter((entity) => {
      if (!entity.hasExt(Positionable)) return false;
      const entityPosition = entity.getExt(Positionable).getCenterPosition();
      return position.distance(entityPosition) <= radius;
    });
  }

  getPlayerEntities(): Player[] {
    return this.players;
  }

  getClosestPlayer(entity: Entity): Player | null {
    if (!entity.hasExt(Positionable)) {
      return null;
    }

    if (this.players.length === 0) {
      return null;
    }

    const entityPosition = entity.getExt(Positionable).getPosition();
    let closestPlayerIdx = 0;
    let closestPlayerDistance = distance(
      entityPosition,
      this.players[closestPlayerIdx].getPosition()
    );

    for (let i = 1; i < this.players.length; i++) {
      const player = this.players[i];
      const playerDistance = distance(entityPosition, player.getPosition());

      if (playerDistance < closestPlayerDistance) {
        closestPlayerIdx = i;
        closestPlayerDistance = playerDistance;
      }
    }

    return this.players[closestPlayerIdx];
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
  getNearbyIntersectingDestructableEntities(sourceEntity: Entity) {
    if (!this.entityFinder) {
      return [];
    }

    const hitBox = sourceEntity.getExt(Collidable).getHitBox();
    const positionable = sourceEntity.getExt(Positionable);
    const position = positionable.getCenterPosition();

    const nearbyEntities = this.entityFinder.getNearbyEntities(position);

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

    if (!sourceEntity.hasExt(Collidable)) {
      return null;
    }

    const hitBox = sourceEntity.getExt(Collidable).getHitBox();
    const positionable = sourceEntity.getExt(Positionable);
    const position = positionable.getCenterPosition();

    const nearbyEntities = this.entityFinder.getNearbyEntities(position);

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

    for (const entity of this.updatableEntities) {
      this.updateExtensions(entity, deltaTime);
    }
  }

  // Use the pre-filtered updatable extensions for better performance
  updateExtensions(entity: Entity, deltaTime: number) {
    for (const extension of entity.getUpdatableExtensions()) {
      (extension as any).update(deltaTime);
    }
  }

  private refreshSpatialGrid() {
    if (!this.entityFinder) {
      return;
    }

    // Handle initial grid population: if grid is empty, populate all entities
    if (this.entitiesInGrid.size === 0) {
      this.entities.forEach((entity) => {
        if (entity.hasExt(Positionable)) {
          this.entityFinder!.addEntity(entity);
          this.entitiesInGrid.add(entity);
        }
      });
      return;
    }

    for (const entity of this.dirtyEntities) {
      if (!entity.hasExt(Positionable)) {
        continue;
      }

      // If entity is not in grid yet, add it
      if (!this.entitiesInGrid.has(entity)) {
        this.entityFinder!.addEntity(entity);
        this.entitiesInGrid.add(entity);
      } else {
        // Entity is already in grid, update its position
        this.entityFinder!.updateEntity(entity);
      }
    }

    // Clear dirty set after processing
    this.dirtyEntities.clear();

    // Handle newly added entities that aren't in the grid yet
    // Use the tracked set instead of looping through all entities
    let newEntityCount = 0;
    for (const entity of this.entitiesToAddToGrid) {
      if (entity.hasExt(Positionable) && !this.entitiesInGrid.has(entity)) {
        this.entityFinder!.addEntity(entity);
        this.entitiesInGrid.add(entity);
        newEntityCount++;
      }
    }
    // Clear the set after processing
    this.entitiesToAddToGrid.clear();
  }

  public getBroadcaster(): Broadcaster {
    return this.getGameManagers().getBroadcaster();
  }

  createEntity(entityType: EntityType): IEntity | null {
    // First check override registry for custom entity classes
    const overrideConstructor = entityOverrideRegistry.get(entityType);
    if (overrideConstructor) {
      return new overrideConstructor(this.getGameManagers());
    }

    // Fallback to generic entity generation from configs
    const genericEntity = this.createGenericEntity(entityType);
    if (genericEntity) {
      return genericEntity;
    }

    console.warn(`createEntity failed - Unknown entity type: ${entityType}`);
    return null;
  }

  private createGenericEntity(entityType: EntityType): IEntity | null {
    // Try to create from item registry
    const itemConfig = itemRegistry.get(entityType);
    if (itemConfig) {
      return new GenericItemEntity(this.getGameManagers(), entityType, itemConfig);
    }

    // Could add other registry checks here (weapons, environment, etc.)
    // For now, we'll focus on items

    return null;
  }

  public getEntityStateTracker(): EntityStateTracker {
    return this.entityStateTracker;
  }

  getZombieEntities(): BaseEnemy[] {
    return this.zombies;
  }

  getMerchantEntities(): Entity[] {
    return this.merchants;
  }
}
