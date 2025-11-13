import { Entity } from "@/entities/entity";
import { EntityType } from "@/types/entity";
import Vector2 from "@/util/vector2";
import { SpatialGrid as SpatialGridUtil } from "@/util/spatial-grid";

export class EntityFinder {
  private grid: SpatialGridUtil;

  constructor(mapWidth: number, mapHeight: number) {
    this.grid = new SpatialGridUtil(mapWidth, mapHeight);
  }

  clear() {
    this.grid.clear();
  }

  addEntity(entity: Entity) {
    this.grid.addEntity(entity);
  }

  removeEntity(entity: Entity) {
    this.grid.removeEntity(entity);
  }

  updateEntity(entity: Entity) {
    this.grid.updateEntity(entity);
  }

  getNearbyEntities(position: Vector2, radius: number = 16, filter?: EntityType[]): Entity[] {
    return this.grid.getNearbyEntities(position, radius, filter);
  }
}
