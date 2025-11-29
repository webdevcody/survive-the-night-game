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
import { itemRegistry, resourceRegistry } from "@shared/entities";
import { GenericItemEntity } from "@/entities/items/generic-item-entity";
import { GenericResourceEntity } from "@/entities/items/generic-resource-entity";
import { registerCustomEntities } from "@/entities/register-custom-entities";
import { Player } from "@/entities/players/player";
import { perfTimer } from "@shared/util/performance";
import { profiler } from "@/util/profiler";
import { TickPerformanceTracker } from "@/util/tick-performance-tracker";
import { UpdateScheduler } from "./update-scheduler";

// Register all custom entity classes at module load time
registerCustomEntities();

const STATIC_ENTITIES: EntityType[] = [Entities.BOUNDARY, Entities.CAR];

export class EntityManager implements IEntityManager {
  private entities: Entity[];
  private entityMap: Map<number, Entity> = new Map(); // Fast lookup by ID
  private entitiesByType: Map<EntityType, Entity[]> = new Map(); // Fast lookup by type
  private players: Player[];
  private zombies: BaseEnemy[] = [];
  private merchants: Entity[] = [];
  private entitiesToRemove: Array<{ id: number; expiration: number }> = [];
  private availableIds: number[] = [];
  private maxId: number = 65535; // Maximum ID value (uint16 max)
  private nextNewId: number = 0; // Counter for generating new IDs when pool is empty
  private entityFinder: EntityFinder | null = null;
  private gameManagers?: IGameManagers;
  private entityStateTracker: EntityStateTracker;
  private dynamicEntities: Entity[] = [];
  private updatableEntities: Entity[] = []; // Entities that have extensions with update methods
  private dirtyEntities: Set<Entity> = new Set();
  private entitiesInGrid: Set<Entity> = new Set();
  private entitiesToAddToGrid: Set<Entity> = new Set();
  private tickPerformanceTracker: TickPerformanceTracker | null = null;
  private updateScheduler: UpdateScheduler;

  constructor() {
    this.entities = [];
    this.players = [];
    this.entityStateTracker = new EntityStateTracker();
    this.updateScheduler = new UpdateScheduler();
    // Initialize ID pool with all valid IDs
    this.availableIds = Array.from({ length: this.maxId + 1 }, (_, i) => i);
  }

  setGameManagers(gameManagers: IGameManagers) {
    this.gameManagers = gameManagers;
  }

  setTickPerformanceTracker(tracker: TickPerformanceTracker) {
    this.tickPerformanceTracker = tracker;
  }

  getGameManagers(): IGameManagers {
    if (!this.gameManagers) {
      throw new Error("GameManagers not set");
    }
    return this.gameManagers;
  }

  public getEntityById(id: number): Entity | null {
    return this.entityMap.get(id) ?? null;
  }

  public getEntitiesByType(type: EntityType): Entity[] {
    return this.entitiesByType.get(type) ?? [];
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
        const entity = new overrideConstructor(this.getGameManagers(), item.state);
        return entity;
      } catch (e) {
        // If constructor doesn't accept state, try without
        const entity = new overrideConstructor(this.getGameManagers());
        return entity;
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
    // Safety check: duplicate IDs cause severe state corruption
    if (this.entityMap.has(entity.getId())) {
      console.error(
        `[Server] CRITICAL: addEntity called for existing ID ${entity.getId()}. Force cleaning up old entity to prevent corruption.`
      );
      // Remove the old entity to clean up lists/maps
      this.removeEntity(entity.getId());

      // removeEntity puts the ID back into availableIds for reuse.
      // But we are strictly using this ID right now for the new entity.
      // So we must remove it from the pool to prevent it being given to someone else.
      const idIndex = this.availableIds.indexOf(entity.getId());
      if (idIndex !== -1) {
        this.availableIds.splice(idIndex, 1);
      }
    }

    this.entities.push(entity);
    this.entityMap.set(entity.getId(), entity);

    // Add to type-based map
    const entityType = entity.getType();
    if (!this.entitiesByType.has(entityType)) {
      this.entitiesByType.set(entityType, []);
    }
    this.entitiesByType.get(entityType)!.push(entity);

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
      // Register with update scheduler
      this.updateScheduler.registerEntity(entity);
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

    // Track new entities if they're already dirty (new entities need to be sent to clients)
    if (entity.isDirty()) {
      this.entityStateTracker.trackDirtyEntity(entity);
    }
  }

  getEntities(): Entity[] {
    return this.entities;
  }

  getEntitiesToRemove(): Array<{ id: number; expiration: number }> {
    return this.entitiesToRemove;
  }

  markEntityForRemoval(entity: Entity, expiration = 0) {
    entity.setMarkedForRemoval(true);
    this.entitiesToRemove.push({
      id: entity.getId(),
      expiration: Date.now() + expiration,
    });
  }

  removeEntity(entityId: number) {
    // Always track removal so clients receive the removal in the next state update
    // This ensures removal is tracked even if entity isn't found (defensive programming)
    this.entityStateTracker.trackRemoval(entityId);

    const entity = this.entityMap.get(entityId);
    if (entity) {
      // Clean up tracking data
      this.dirtyEntities.delete(entity);
      this.entitiesInGrid.delete(entity);
      this.entitiesToAddToGrid.delete(entity);
      // Untrack from entity state tracker (entity is being removed)
      this.entityStateTracker.untrackDirtyEntity(entity);
      // Remove from updatable entities and update entity count
      const updatableIndex = this.updatableEntities.indexOf(entity);
      if (updatableIndex > -1) {
        this.updatableEntities.splice(updatableIndex, 1);
        // Unregister from update scheduler
        this.updateScheduler.unregisterEntity(entity.getId());
        // Decrement entity count for this type
      }

      // Remove from dynamic entities list
      const dynamicIndex = this.dynamicEntities.indexOf(entity);
      if (dynamicIndex > -1) {
        this.dynamicEntities.splice(dynamicIndex, 1);
      }

      // Remove from spatial grid if it's in there
      if (this.entityFinder && entity.hasExt(Positionable)) {
        this.entityFinder.removeEntity(entity);
      }

      // Remove from type-based map
      const entityType = entity.getType();
      const typeEntities = this.entitiesByType.get(entityType);
      if (typeEntities) {
        const typeIndex = typeEntities.indexOf(entity);
        if (typeIndex > -1) {
          typeEntities.splice(typeIndex, 1);
        }
        // Clean up empty arrays
        if (typeEntities.length === 0) {
          this.entitiesByType.delete(entityType);
        }
      }
    }

    this.entityMap.delete(entityId);
    this.entitiesToRemove = this.entitiesToRemove.filter((it) => it.id !== entityId);
    this.spliceWhere(this.players, (it) => it.getId() === entityId);
    this.spliceWhere(this.zombies, (it) => it.getId() === entityId);
    this.spliceWhere(this.merchants, (it) => it.getId() === entityId);
    this.spliceWhere(this.entities, (it) => it.getId() === entityId);

    // Return the ID to the pool for reuse (only if it's not already there)
    // This prevents duplicate IDs in the pool if removeEntity is called multiple times
    if (!this.availableIds.includes(entityId)) {
      this.availableIds.push(entityId);
    }
  }

  private spliceWhere(array: any[], predicate: (item: any) => boolean): void {
    for (let i = array.length - 1; i >= 0; i--) {
      if (predicate(array[i])) {
        array.splice(i, 1);
      }
    }
  }

  generateEntityId(): number {
    // Pop an ID from the available pool
    const id = this.availableIds.pop();
    if (id !== undefined) {
      return id;
    }

    // If pool is empty, all 65536 IDs are in use
    // Check if we've actually exhausted all IDs or if there's a recycling issue
    const activeEntityCount = this.entityMap.size;
    const expectedAvailableIds = this.maxId + 1 - activeEntityCount;

    if (activeEntityCount >= this.maxId + 1) {
      // All IDs are in use - this is the real limit
      throw new Error(
        `Entity ID pool exhausted. Max ID: ${this.maxId}, Active entities: ${activeEntityCount}. ` +
          `Cannot create more entities.`
      );
    }

    // Pool is empty but we have fewer than maxId+1 entities
    // This indicates IDs are not being recycled properly
    console.error(
      `CRITICAL: Entity ID pool empty but only ${activeEntityCount} entities exist ` +
        `(expected ${expectedAvailableIds} available IDs). This indicates IDs are not being recycled properly. ` +
        `Attempting to recover by finding unused IDs...`
    );

    // Try to find an unused ID by checking entityMap
    // This is a fallback recovery mechanism
    for (let i = 0; i <= this.maxId; i++) {
      if (!this.entityMap.has(i)) {
        console.warn(`Recovered unused ID ${i} for reuse`);
        return i;
      }
    }

    // If we get here, something is very wrong
    throw new Error(
      `Entity ID pool exhausted and recovery failed. Max ID: ${this.maxId}, ` +
        `Active entities: ${activeEntityCount}, Available IDs: ${this.availableIds.length}`
    );
  }

  isEntityMarkedForRemoval(entityId: number): boolean {
    return this.entitiesToRemove.some((it) => it.id === entityId);
  }

  pruneEntities() {
    const now = Date.now();

    if (this.dynamicEntities.length === 0 || this.entitiesToRemove.length === 0) {
      return;
    }

    const entitiesToRemoveMap = new Map<number, { id: number; expiration: number }>([]);
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
      // Ensure removed entities are not treated as dirty changes
      this.entityStateTracker.untrackDirtyEntity(entity);

      // Clean up spatial grid tracking data
      this.dirtyEntities.delete(entity);
      this.entitiesInGrid.delete(entity);
      this.entitiesToAddToGrid.delete(entity);

      // Remove from updatable entities and update entity count
      const updatableIndex = this.updatableEntities.indexOf(entity);
      if (updatableIndex > -1) {
        this.updatableEntities.splice(updatableIndex, 1);
        // Unregister from update scheduler
        this.updateScheduler.unregisterEntity(entity.getId());
        // Decrement entity count for this type
      }

      if (this.entityFinder && entity.hasExt(Positionable)) {
        this.entityFinder.removeEntity(entity);
      }

      // Remove from dynamicEntities
      this.dynamicEntities.splice(i, 1);

      // Remove from map and main entities array
      this.entityMap.delete(entity.getId());
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

      // Remove from type-based map
      const entityType = entity.getType();
      const typeEntities = this.entitiesByType.get(entityType);
      if (typeEntities) {
        const typeIndex = typeEntities.indexOf(entity);
        if (typeIndex > -1) {
          typeEntities.splice(typeIndex, 1);
        }
        // Clean up empty arrays
        if (typeEntities.length === 0) {
          this.entitiesByType.delete(entityType);
        }
      }

      // Return the ID to the pool for reuse (only if it's not already there)
      // This prevents duplicate IDs in the pool if pruneEntities processes the same entity twice
      const entityId = entity.getId();
      if (!this.availableIds.includes(entityId)) {
        this.availableIds.push(entityId);
      }
    }

    // Clean up expired entries from entitiesToRemove
    this.spliceWhere(this.entitiesToRemove, (it) => now >= it.expiration);
  }

  clear() {
    this.entities = [];
    this.entityMap.clear();
    this.entitiesByType.clear();
    this.players = [];
    this.zombies = [];
    this.merchants = [];
    this.dynamicEntities = [];
    this.updatableEntities = [];
    this.dirtyEntities.clear();
    this.entitiesInGrid.clear();
    this.entitiesToAddToGrid.clear();
    this.updateScheduler.clear();
    // Reset ID pool to contain all valid IDs
    this.availableIds = Array.from({ length: this.maxId + 1 }, (_, i) => i);
    this.nextNewId = 0;
  }

  getNearbyEntities(position: Vector2, radius: number = 64, filterSet?: Set<EntityType>): Entity[] {
    // Spatial grid already filters by distance, so we can return entities directly
    // Only filter out entities without Positionable extension
    const entities = this.entityFinder?.getNearbyEntities(position, radius, filterSet) ?? [];

    // Fast path: if all entities have Positionable (common case), return directly
    // Only do expensive filtering if needed
    const filteredEntities: Entity[] = [];
    const radiusSquared = radius * radius; // Use squared distance to avoid sqrt

    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i];
      if (!entity.hasExt(Positionable)) continue;

      // Use squared distance comparison (spatial grid already filters by radius, but we verify)
      const entityPosition = entity.getExt(Positionable).getCenterPosition();
      const dx = position.x - entityPosition.x;
      const dy = position.y - entityPosition.y;
      if (dx * dx + dy * dy <= radiusSquared) {
        filteredEntities.push(entity);
      }
    }

    return filteredEntities;
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
      // Skip dead players and zombie players (zombies shouldn't be targeted by enemy AI)
      if (player.isDead() || player.isZombie()) continue;

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

    // Use a small radius for collision detection (just enough to check nearby collidables)
    // Default cellSize (16) is appropriate for collision checks
    const collisionRadius = 32; // Slightly larger than cellSize to catch nearby entities

    // Convert ignoreTypes array to Set for O(1) lookup instead of O(n) includes()
    const ignoreTypesSet = ignoreTypes ? new Set(ignoreTypes) : undefined;

    // Query spatial grid directly to avoid extra filtering overhead
    const nearbyEntities = this.entityFinder.getNearbyEntities(position, collisionRadius);

    // Early exit optimizations
    for (const otherEntity of nearbyEntities) {
      // Skip ignored types early (using Set for O(1) lookup)
      if (ignoreTypesSet && ignoreTypesSet.has(otherEntity.getType())) {
        continue;
      }

      // Skip self early
      if (otherEntity === sourceEntity) {
        continue;
      }

      // Check if collidable before expensive operations
      if (!otherEntity.hasExt(Collidable)) {
        continue;
      }

      const collidable = otherEntity.getExt(Collidable);
      if (!collidable.isEnabled()) {
        continue;
      }

      // Only do expensive intersection check if we got this far
      const targetBox = collidable.getHitBox();
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
    // Track refreshSpatialGrid as sub-method
    const endRefreshSpatialGrid =
      this.tickPerformanceTracker?.startMethod("refreshSpatialGrid", "updateEntities") ||
      (() => {});
    this.refreshSpatialGrid();
    endRefreshSpatialGrid();

    // Advance frame counter for update scheduler
    this.updateScheduler.advanceFrame();

    // Track updateExtensions loop
    const endUpdateExtensionsLoop =
      this.tickPerformanceTracker?.startMethod("updateExtensionsLoop", "updateEntities") ||
      (() => {});
    for (const entity of this.updatableEntities) {
      // Check if entity should update based on tier system
      if (this.updateScheduler.shouldUpdate(entity, this.players)) {
        this.updateExtensions(entity, deltaTime);
      }
    }
    endUpdateExtensionsLoop();
  }

  // Use the pre-filtered updatable extensions for better performance
  updateExtensions(entity: Entity, deltaTime: number) {
    // Track entity update time if performance monitoring is enabled
    const endEntityUpdate =
      this.tickPerformanceTracker?.startEntityUpdate(entity.getId(), entity.getType()) ||
      (() => {});

    // Track extension updates
    const endExtensionUpdates =
      this.tickPerformanceTracker?.startMethod("extensionUpdates", "updateExtensionsLoop") ||
      (() => {});
    for (const extension of entity.getUpdatableExtensions()) {
      (extension as any).update(deltaTime);
    }
    endExtensionUpdates();

    endEntityUpdate();
  }

  private refreshSpatialGrid() {
    if (!this.entityFinder) {
      return;
    }

    // Handle initial grid population: if grid is empty, populate all entities
    if (this.entitiesInGrid.size === 0) {
      const endInitialPopulation =
        this.tickPerformanceTracker?.startMethod("initialGridPopulation", "refreshSpatialGrid") ||
        (() => {});
      this.entities.forEach((entity) => {
        if (entity.hasExt(Positionable)) {
          this.entityFinder!.addEntity(entity);
          this.entitiesInGrid.add(entity);
        }
      });
      endInitialPopulation();
      return;
    }

    // Early return optimization: if no dirty entities and no new entities to add, skip refresh
    if (this.dirtyEntities.size === 0 && this.entitiesToAddToGrid.size === 0) {
      return;
    }

    // Track dirty entity updates
    const endDirtyEntityUpdates =
      this.tickPerformanceTracker?.startMethod("dirtyEntityUpdates", "refreshSpatialGrid") ||
      (() => {});
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
    endDirtyEntityUpdates();

    // Clear dirty set after processing
    this.dirtyEntities.clear();

    // Track new entity additions
    const endNewEntityAdditions =
      this.tickPerformanceTracker?.startMethod("newEntityAdditions", "refreshSpatialGrid") ||
      (() => {});
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
    endNewEntityAdditions();
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

    // Try to create from resource registry
    const resourceConfig = resourceRegistry.get(entityType);
    if (resourceConfig) {
      return new GenericResourceEntity(this.getGameManagers(), entityType, resourceConfig);
    }

    // Could add other registry checks here (weapons, environment, etc.)
    // For now, we'll focus on items and resources

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
