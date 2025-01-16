import Positionable from "@/extensions/positionable";
import { Entity } from "@/entities/entity";
import { Vector2 } from "@/util/physics";
import { EntityType } from "@/types/entity";

// TODO move to utils geometry
type Rectangle = { x: number; y: number; width: number; height: number };
type Circle = { x: number; y: number; radius: number };
type Range = ({ type: "rectangle" } & Rectangle) | ({ type: "circle" } & Circle);

class QuadTree {
  #boundary: Rectangle;
  #capacity: number;
  #entities: Entity[] = [];
  #divided: boolean = false;
  #northwest?: QuadTree;
  #northeast?: QuadTree;
  #southwest?: QuadTree;
  #southeast?: QuadTree;

  get boundary() {
    return this.#boundary;
  }

  get capacity() {
    return this.#capacity;
  }

  constructor(boundary: Rectangle, capacity: number) {
    this.#boundary = boundary;
    this.#capacity = capacity;
  }

  add(entity: Entity): boolean {
    if (!this.contains(entity)) {
      return false;
    }

    if (this.#entities.length < this.#capacity) {
      this.#entities.push(entity);
      return true;
    } else {
      if (!this.#divided) {
        this.subdivide();
      }

      return (
        (this.#northwest && this.#northwest.add(entity)) ||
        (this.#northeast && this.#northeast.add(entity)) ||
        (this.#southwest && this.#southwest.add(entity)) ||
        (this.#southeast && this.#southeast.add(entity)) ||
        false
      );
    }
  }

  private contains(entity: Entity): boolean {
    const pos = entity.getExt(Positionable).getPosition();

    return (
      pos.x >= this.boundary.x &&
      pos.x <= this.boundary.x + this.boundary.width &&
      pos.y >= this.boundary.y &&
      pos.y <= this.boundary.y + this.boundary.height
    );
  }

  private subdivide() {
    const { x, y, width, height } = this.boundary;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    this.#northwest = new QuadTree({ x, y, width: halfWidth, height: halfHeight }, this.#capacity);

    this.#northeast = new QuadTree(
      { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
      this.#capacity
    );

    this.#southwest = new QuadTree(
      { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
      this.#capacity
    );

    this.#southeast = new QuadTree(
      { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
      this.#capacity
    );

    this.#divided = true;
  }

  query(range: Range, found: Entity[] = []): Entity[] {
    if (!this.intersects(range)) {
      return found;
    }

    for (const entity of this.#entities) {
      if (this.contains(entity)) {
        found.push(entity);
      }
    }

    if (this.#divided) {
      this.#northwest!.query(range, found);
      this.#northeast!.query(range, found);
      this.#southwest!.query(range, found);
      this.#southeast!.query(range, found);
    }

    return found;
  }

  private intersects(range: Range): boolean {
    switch (range.type) {
      case "rectangle":
        return !(
          range.x > this.boundary.x + this.boundary.width ||
          range.x + range.width < this.boundary.x ||
          range.y > this.boundary.y + this.boundary.height ||
          range.y + range.height < this.boundary.y
        );
      case "circle":
        const closestX = Math.max(
          this.boundary.x,
          Math.min(range.x, this.boundary.x + this.boundary.width)
        );
        const closestY = Math.max(
          this.boundary.y,
          Math.min(range.y, this.boundary.y + this.boundary.height)
        );
        const distanceX = range.x - closestX;
        const distanceY = range.y - closestY;
        return distanceX * distanceX + distanceY * distanceY <= range.radius * range.radius;
    }
  }
}

export class SpatialGrid {
  #quadTree: QuadTree;

  constructor(mapWidth: number, mapHeight: number, capacity: number = 4) {
    this.#quadTree = new QuadTree({ x: 0, y: 0, width: mapWidth, height: mapHeight }, capacity);
  }

  clear() {
    this.#quadTree = new QuadTree(this.#quadTree.boundary, this.#quadTree.capacity);
  }

  addEntity(entity: Entity) {
    this.#quadTree.add(entity);
  }

  getNearbyEntities(position: Vector2, radius: number = 16, filter?: EntityType[]): Entity[] {
    return this.getNearbyEntitiesByRange(
      {
        type: "circle",
        x: position.x,
        y: position.y,
        radius,
      },
      filter
    );
  }

  getNearbyEntitiesByRange(range: Range, filter?: EntityType[]): Entity[] {
    const nearby = this.#quadTree.query(range);
    return filter ? nearby.filter((entity) => filter.includes(entity.getType())) : nearby;
  }
}
