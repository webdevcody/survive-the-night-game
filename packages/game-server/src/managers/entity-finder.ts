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

  getNearbyEntities(position: Vector2, radius: number = 16, filter?: EntityType[]): Entity[] {
    const nearby = Array.from(this.grid.getNearbyEntities(position, radius));
    return filter ? nearby.filter((entity) => filter.includes(entity.getType())) : nearby;
  }
}
