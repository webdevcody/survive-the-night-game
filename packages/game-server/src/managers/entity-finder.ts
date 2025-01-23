import Positionable from "@/extensions/positionable";
import { Entity } from "@/entities/entity";
import { EntityType } from "@/types/entity";
import Shape, { Circle, Rectangle } from "@/util/shape";
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
    return this.getNearbyEntitiesByRange(new Circle(position, radius), filter);
  }

  getNearbyEntitiesByRange(range: Shape, filter?: EntityType[]): Entity[] {
    const nearby = Array.from(this.grid.getNearbyEntities(range.position));
    return filter ? nearby.filter((entity) => filter.includes(entity.getType())) : nearby;
  }
}
