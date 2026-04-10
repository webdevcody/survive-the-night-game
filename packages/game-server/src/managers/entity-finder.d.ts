import { Entity } from "@/entities/entity";
import { EntityType } from "@/types/entity";
import Vector2 from "@/util/vector2";
export declare class EntityFinder {
    private grid;
    constructor(mapWidth: number, mapHeight: number);
    clear(): void;
    addEntity(entity: Entity): void;
    removeEntity(entity: Entity): void;
    updateEntity(entity: Entity): void;
    getNearbyEntities(position: Vector2, radius?: number, filterSet?: Set<EntityType>): Entity[];
}
