import { Entity } from "@/entities/entity";
import { SpatialGrid as SharedSpatialGrid } from "@shared/util/spatial-grid";
export declare class SpatialGrid extends SharedSpatialGrid<Entity> {
    constructor(mapWidth: number, mapHeight: number);
}
