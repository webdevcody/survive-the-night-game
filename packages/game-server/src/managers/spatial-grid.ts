import Positionable from "@/extensions/positionable";
import { Entity } from "@/entities/entity";
import { EntityType } from "@/types/entity";
import QuadTree from "@/util/quad-tree";
import Shape, { Circle, Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";

export class SpatialGrid {
  #quadTree: QuadTree;

  constructor(mapWidth: number, mapHeight: number, capacity: number = 4) {
    this.#quadTree = new QuadTree(new Rectangle(new Vector2(0, 0), new Vector2(mapWidth, mapHeight)), capacity);
  }

  clear() {
    this.#quadTree.clear()
  }

  addEntity(entity: Entity) {
    const positionable = entity.getExt(Positionable)
    const position = positionable.getPosition()
    const size = positionable.getSize()
    const rect = new Rectangle(position, size)

    this.#quadTree.add(rect, entity);
  }

  getNearbyEntities(position: Vector2, radius: number = 16, filter?: EntityType[]): Entity[] {
    return this.getNearbyEntitiesByRange(
      new Circle(position, radius),
      filter
    );
  }

  getNearbyEntitiesByRange(range: Shape, filter?: EntityType[]): Entity[] {
    const nearby = Array.from(this.#quadTree.query(range));
    return filter ? nearby.filter((entity) => filter.includes(entity.getType())) : nearby;
  }
}
