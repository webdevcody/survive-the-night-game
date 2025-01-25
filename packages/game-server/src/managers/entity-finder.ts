import { Entity } from "@/entities/entity";
import { EntityType } from "@/types/entity";
import Shape, { Circle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { SpatialGrid as SpatialGridUtil } from "@/util/spatial-grid";
import { Boundary } from "@/entities/environment/boundary";

export class EntityFinder {
  private staticEntities: SpatialGridUtil;
  private dynamicEntities: SpatialGridUtil;

  constructor(mapWidth: number, mapHeight: number) {
    this.dynamicEntities = new SpatialGridUtil(mapWidth, mapHeight);
    this.staticEntities = new SpatialGridUtil(mapWidth, mapHeight);
  }

  clear() {
    this.dynamicEntities.clear();
  }

  addEntity(entity: Entity) {
    if (entity instanceof Boundary) {
      this.staticEntities.addEntity(entity);
    } else {
      this.dynamicEntities.addEntity(entity);
    }
  }

  getNearbyEntities(position: Vector2, radius: number = 16, filter?: EntityType[]): Entity[] {
    return this.getNearbyEntitiesByRange(new Circle(position, radius), filter);
  }

  getNearbyEntitiesByRange(range: Shape, filter?: EntityType[]): Entity[] {
    const nearbyDynamic = Array.from(
      this.dynamicEntities.getNearbyEntities(
        range.position,
        range instanceof Circle ? range.r : undefined
      )
    );
    const nearbyStatic = Array.from(
      this.staticEntities.getNearbyEntities(
        range.position,
        range instanceof Circle ? range.r : undefined
      )
    );
    const allNearby = [...nearbyDynamic, ...nearbyStatic];
    return filter ? allNearby.filter((entity) => filter.includes(entity.getType())) : allNearby;
  }
}
