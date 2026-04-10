import { Entity } from "@/entities/entity";
import { ItemType, InventoryItem } from "@/util/inventory";
import { IEntity } from "@/entities/types";
import { EntityType } from "@shared/types/entity";
import { IGameManagers, IEntityManager, Broadcaster } from "@/managers/types";
import { EntityStateTracker } from "./entity-state-tracker";
import Vector2 from "@/util/vector2";
import { BaseEnemy } from "@/entities/enemies/base-enemy";
import { Player } from "@/entities/players/player";
import { TickPerformanceTracker } from "@/util/tick-performance-tracker";
export declare class EntityManager implements IEntityManager {
    private entities;
    private entityMap;
    private entitiesByType;
    private players;
    private zombies;
    private merchants;
    private entitiesToRemove;
    private availableIds;
    private maxId;
    private nextNewId;
    private entityFinder;
    private gameManagers?;
    private entityStateTracker;
    private dynamicEntities;
    private updatableEntities;
    private dirtyEntities;
    private entitiesInGrid;
    private entitiesToAddToGrid;
    private tickPerformanceTracker;
    private updateScheduler;
    constructor();
    setGameManagers(gameManagers: IGameManagers): void;
    setTickPerformanceTracker(tracker: TickPerformanceTracker): void;
    getGameManagers(): IGameManagers;
    getEntityById(id: number): Entity | null;
    getEntitiesByType(type: EntityType): Entity[];
    hasRegisteredItem(type: ItemType): boolean;
    getDynamicEntities(): Entity[];
    createEntityFromItem(item: InventoryItem): Entity | null;
    setMapSize(width: number, height: number): void;
    addEntity(entity: Entity): void;
    getEntities(): Entity[];
    getEntitiesToRemove(): Array<{
        id: number;
        expiration: number;
    }>;
    markEntityForRemoval(entity: Entity, expiration?: number): void;
    removeEntity(entityId: number): void;
    private spliceWhere;
    /**
     * Cleans up entity from all tracking structures
     * Handles common cleanup logic shared between removeEntity() and pruneEntities()
     * Note: Does not remove from specialized arrays (players, zombies, merchants) or main entities array
     */
    private cleanupEntityFromTracking;
    generateEntityId(): number;
    isEntityMarkedForRemoval(entityId: number): boolean;
    pruneEntities(): void;
    clear(): void;
    getNearbyEntities(position: Vector2, radius?: number, filterSet?: Set<EntityType>): Entity[];
    getPlayerEntities(): Player[];
    getClosestPlayer(entity: Entity): Player | null;
    getClosestAlivePlayer(entity: Entity, attackRange?: number): Player | null;
    getNearbyIntersectingDestructableEntities(sourceEntity: Entity): Entity<readonly string[]>[];
    /**
     * This function will return the first entity that intersects with the source entity, but it requires
     * that the entity has a method with the name of the functionIdentifier.
     */
    getIntersectingCollidableEntity(sourceEntity: Entity, ignoreTypes?: EntityType[]): Entity | null;
    isColliding(sourceEntity: Entity, ignoreTypes?: EntityType[]): Entity | null;
    update(deltaTime: number): void;
    updateExtensions(entity: Entity, deltaTime: number): void;
    private refreshSpatialGrid;
    getBroadcaster(): Broadcaster;
    createEntity(entityType: EntityType): IEntity | null;
    getEntityStateTracker(): EntityStateTracker;
    getZombieEntities(): BaseEnemy[];
    getMerchantEntities(): Entity[];
}
