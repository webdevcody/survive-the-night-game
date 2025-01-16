import { GameEvent } from "@/events/types";
import { Hitbox } from "@/util/hitbox";
import { InventoryItem } from "@/util/inventory";
import { Vector2 } from "@/util/physics";
import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";

export interface IEntityManager {
  generateEntityId(): string;
  addEntity(entity: IEntity): void;
  markEntityForRemoval(entity: IEntity): void;
  createEntityFromItem(item: InventoryItem): IEntity;
  isColliding(entity: IEntity, IEntityTypes?: EntityType[]): IEntity | null;
  getClosestAlivePlayer(entity: IEntity): IEntity | null;
  getEntityById(id: string): IEntity | null;
  getNearbyEntities(position: Vector2, radius?: number, entityTypes?: EntityType[]): IEntity[];
  registerItem(key: string, entityClass: new (entityManager: IEntityManager) => IEntity): void;
  getNearbyIntersectingDestructableEntities(sourceEntity: IEntity, sourceHitbox: Hitbox): IEntity[];
  getBroadcaster(): Broadcaster;
  getPlayerEntities(): IEntity[];
  getEntitiesToRemove(): Array<{ id: string; expiration: number }>;
  clear(): void;
  update(deltaTime: number): void;
  getEntities(): IEntity[];
  setMapSize(width: number, height: number): void;
  createEntity(entityType: EntityType): IEntity | null;
}

export interface Broadcaster {
  broadcastEvent(event: GameEvent<any>): void;
}

export interface IMapManager {
  getMap(): number[][];
}

export interface IGameManagers {
  getEntityManager(): IEntityManager;
  getMapManager(): IMapManager;
  getBroadcaster(): Broadcaster;
}
