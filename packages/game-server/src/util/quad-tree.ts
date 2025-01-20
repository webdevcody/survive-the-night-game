import { Entity } from "@/entities/entity";
import Shape, { Rectangle } from "@/util/shape";

export class QuadTree {
  private shapes: Map<Shape, Entity> = new Map();
  private capacity: number;
  private boundary: Rectangle;
  private divided: boolean = false;
  private northeast?: QuadTree;
  private northwest?: QuadTree;
  private southeast?: QuadTree;
  private southwest?: QuadTree;

  constructor(boundary: Rectangle, capacity: number = 4) {
    this.boundary = boundary;
    this.capacity = capacity;
  }

  add(shape: Shape, entity: Entity): boolean {
    if (!this.boundary.intersects(shape)) {
      return false;
    }

    if (this.shapes.size < this.capacity && !this.divided) {
      this.shapes.set(shape, entity);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    // Count how many subdivisions this shape intersects with
    let intersectionCount = 0;
    let intersectingQuad = null;

    if (this.northeast!.boundary.intersects(shape)) {
      intersectionCount++;
      intersectingQuad = this.northeast;
    }
    if (this.northwest!.boundary.intersects(shape)) {
      intersectionCount++;
      intersectingQuad = this.northwest;
    }
    if (this.southeast!.boundary.intersects(shape)) {
      intersectionCount++;
      intersectingQuad = this.southeast;
    }
    if (this.southwest!.boundary.intersects(shape)) {
      intersectionCount++;
      intersectingQuad = this.southwest;
    }

    // If it only intersects one subdivision, add it there
    if (intersectionCount === 1 && intersectingQuad) {
      return intersectingQuad.add(shape, entity);
    }

    // If it intersects multiple subdivisions (or none), store it in this node
    this.shapes.set(shape, entity);
    return true;
  }

  private subdivide(): void {
    const { position, size } = this.boundary;
    const half = size.div(2);

    this.northeast = new QuadTree(new Rectangle(position.add(half, "x"), half), this.capacity);
    this.northwest = new QuadTree(new Rectangle(position, half), this.capacity);
    this.southeast = new QuadTree(new Rectangle(position.add(half), half), this.capacity);
    this.southwest = new QuadTree(new Rectangle(position.add(half, "y"), half), this.capacity);

    // Redistribute existing shapes to children
    const existingShapes = Array.from(this.shapes.entries());
    this.shapes.clear();

    for (const [shape, entity] of existingShapes) {
      // This will automatically put the shape in the appropriate subdivision
      // or back in this node if it intersects multiple subdivisions
      this.add(shape, entity);
    }

    this.divided = true;
  }

  query(range: Shape, found: Set<Entity> = new Set()): Set<Entity> {
    if (!this.boundary.intersects(range)) {
      return found;
    }

    for (const [shape, entity] of this.shapes) {
      if (range.intersects(shape)) {
        found.add(entity);
      }
    }

    if (this.divided) {
      this.northeast!.query(range, found);
      this.northwest!.query(range, found);
      this.southeast!.query(range, found);
      this.southwest!.query(range, found);
    }

    return found;
  }

  clear() {
    this.shapes.clear();
    this.divided = false;
    this.northeast = undefined;
    this.northwest = undefined;
    this.southeast = undefined;
    this.southwest = undefined;
  }
}

export default QuadTree;
