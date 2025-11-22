import { GameEvent } from "@/events/types";
import { InventoryItem } from "@/util/inventory";
import Vector2 from "@shared/util/vector2";
import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";
import { EntityStateTracker } from "./entity-state-tracker";

export interface IEntityManager {
  generateEntityId(): number;
  addEntity(entity: IEntity): void;
  markEntityForRemoval(entity: IEntity, expiration?: number): void;
  removeEntity(entityId: number): void;
  createEntityFromItem(item: InventoryItem): IEntity | null;
  isColliding(entity: IEntity, IEntityTypes?: EntityType[]): IEntity | null;
  getClosestAlivePlayer(entity: IEntity): IEntity | null;
  getEntityById(id: number): IEntity | null;
  getEntitiesByType(type: EntityType): IEntity[];
  getNearbyEntities(position: Vector2, radius?: number, filterSet?: Set<EntityType>): IEntity[];
  getNearbyIntersectingDestructableEntities(sourceEntity: IEntity): IEntity[];
  getBroadcaster(): Broadcaster;
  getIntersectingCollidableEntity(
    sourceEntity: IEntity,
    ignoreTypes?: EntityType[]
  ): IEntity | null;
  getPlayerEntities(): IEntity[];
  getEntitiesToRemove(): Array<{ id: number; expiration: number }>;
  clear(): void;
  update(deltaTime: number): void;
  getEntities(): IEntity[];
  setMapSize(width: number, height: number): void;
  createEntity(entityType: EntityType): IEntity | null;
  getEntityStateTracker(): EntityStateTracker;
}

export interface Broadcaster {
  broadcastEvent(event: GameEvent<any>): void;
}

export interface IMapManager {
  getMap(): number[][];
  getGroundLayer(): number[][];
  getCollidablesLayer(): number[][];
  getCarLocation(): Vector2 | null;
  isPositionValidForPlacement(
    position: Vector2,
    checkEntities?: boolean,
    entitySize?: number
  ): boolean;
  getEmptyGroundTiles(center?: Vector2, radius?: number): Set<Vector2>;
  getValidSpawnPositionsInBiome(biomeX: number, biomeY: number): Vector2[];
  findRandomValidSpawnPosition(
    center: Vector2,
    minRadius: number,
    maxRadius: number
  ): Vector2 | null;
  spawnZombiesAroundCampsite(
    zombieType: "regular" | "fast" | "big" | "bat" | "spitter",
    count: number
  ): void;
}

export interface IGameServer {
  endGame(): void;
}

export interface IGameManagers {
  getEntityManager(): IEntityManager;
  getMapManager(): IMapManager;
  getBroadcaster(): Broadcaster;
  getGameServer(): IGameServer;
}
