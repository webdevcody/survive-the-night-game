import { Entity } from "@/entities/entity";
import Positionable from "@/extensions/positionable";
import { SpatialGrid as SharedSpatialGrid } from "@shared/util/spatial-grid";

export class SpatialGrid extends SharedSpatialGrid<Entity> {
  constructor(mapWidth: number, mapHeight: number) {
    super(mapWidth, mapHeight, 16, (entity) => {
      if (entity.hasExt(Positionable)) {
        return entity.getExt(Positionable).getCenterPosition();
      }
      return null;
    });
  }
}
