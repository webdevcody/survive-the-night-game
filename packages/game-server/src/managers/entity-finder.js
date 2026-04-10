import { SpatialGrid as SpatialGridUtil } from "@/util/spatial-grid";
import { getConfig } from "@shared/config";
export class EntityFinder {
    constructor(mapWidth, mapHeight) {
        this.grid = new SpatialGridUtil(mapWidth, mapHeight);
    }
    clear() {
        this.grid.clear();
    }
    addEntity(entity) {
        this.grid.addEntity(entity);
    }
    removeEntity(entity) {
        this.grid.removeEntity(entity);
    }
    updateEntity(entity) {
        this.grid.updateEntity(entity);
    }
    getNearbyEntities(position, radius = getConfig().world.TILE_SIZE, filterSet) {
        return this.grid.getNearbyEntities(position, radius, filterSet);
    }
}
