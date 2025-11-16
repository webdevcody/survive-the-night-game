import Vector2 from "./vector2";
import PoolManager from "./pool-manager";

abstract class Shape {
  position: Vector2;

  constructor(position: Vector2) {
    this.position = position;
  }

  abstract intersects(other: Shape): boolean;
  abstract reset(...args: any[]): this;
}

class Point extends Shape {
  constructor(position: Vector2) {
    super(position);
  }

  intersects(other: Shape): boolean {
    if (other instanceof Point) {
      return this.position.x === other.position.x && this.position.y === other.position.y;
    } else if (other instanceof Circle || other instanceof Rectangle || other instanceof Line) {
      return other.intersects(this);
    }
    return false;
  }

  reset(position: Vector2): this {
    this.position = position;
    return this;
  }
}

class Line extends Shape {
  start: Vector2;
  end: Vector2;

  constructor(start: Vector2, end: Vector2) {
    super(start.add(end).div(2));
    this.start = start;
    this.end = end;
  }

  getClosestPoint(point: Vector2): Vector2 {
    const poolManager = PoolManager.getInstance();
    const lineVector = this.end.sub(this.start);
    const pointVector = point.sub(this.start);
    const zeroVec = poolManager.vector2.claim(0, 0);
    const lineLengthSquared = lineVector.distanceSquared(zeroVec);
    poolManager.vector2.release(zeroVec);
    const t = Math.max(0, Math.min(1, pointVector.dot(lineVector) / lineLengthSquared));
    return this.start.add(lineVector.mul(t));
  }

  intersects(other: Shape): boolean {
    if (other instanceof Line) {
      const d1 = this.end.sub(this.start);
      const d2 = other.end.sub(other.start);
      const denom = d1.cross(d2);

      if (Math.abs(denom) < Number.EPSILON) return false;

      const d = other.start.sub(this.start);
      const t1 = d.cross(d2) / denom;
      const t2 = d.cross(d1) / denom;

      return t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1;
    } else if (other instanceof Point) {
      const lineVector = this.end.sub(this.start);
      const pointVector = other.position.sub(this.start);
      const crossProduct = pointVector.cross(lineVector);
      if (Math.abs(crossProduct) > Number.EPSILON) return false;
      const dotProduct = pointVector.dot(lineVector);
      if (dotProduct < 0) return false;
      const squaredLength = this.start.distanceSquared(this.end);
      return dotProduct <= squaredLength;
    } else if (other instanceof Circle) {
      return other.intersects(this);
    } else if (other instanceof Rectangle) {
      return other.intersects(this);
    }

    return false;
  }

  reset(start: Vector2, end: Vector2): this {
    this.start = start;
    this.end = end;
    this.position = start.add(end).div(2);
    return this;
  }
}

class Circle extends Shape {
  radius: number;

  constructor(position: Vector2, r: number) {
    super(position);
    this.radius = r;
  }

  getRadius() {
    return this.radius;
  }

  intersects(other: Shape): boolean {
    if (other instanceof Circle) {
      const radius = this.radius + other.radius;
      return this.position.distanceSquared(other.position) <= radius * radius;
    } else if (other instanceof Point) {
      return this.position.distanceSquared(other.position) <= this.radius * this.radius;
    } else if (other instanceof Rectangle) {
      const closest = this.position.closest(other.position, other.size);
      return this.position.distanceSquared(closest) <= this.radius * this.radius;
    } else if (other instanceof Line) {
      const poolManager = PoolManager.getInstance();
      const lineVector = other.end.sub(other.start);
      const pointVector = this.position.sub(other.start);
      const zeroVec = poolManager.vector2.claim(0, 0);
      const lineLengthSquared = lineVector.distanceSquared(zeroVec);
      poolManager.vector2.release(zeroVec);
      const t = Math.max(0, Math.min(1, pointVector.dot(lineVector) / lineLengthSquared));
      const closestPoint = other.start.add(lineVector.mul(t));
      return this.position.distanceSquared(closestPoint) <= this.radius * this.radius;
    }

    return false;
  }

  reset(position: Vector2, radius: number): this {
    this.position = position;
    this.radius = radius;
    return this;
  }
}

class Rectangle extends Shape {
  size: Vector2;

  get topLeft() {
    return this.position;
  }

  get topRight() {
    const poolManager = PoolManager.getInstance();
    const vec = poolManager.vector2.claim(this.size.x, 0);
    const result = this.position.add(vec);
    poolManager.vector2.release(vec);
    return result;
  }

  get bottomLeft() {
    const poolManager = PoolManager.getInstance();
    const vec = poolManager.vector2.claim(0, this.size.y);
    const result = this.position.add(vec);
    poolManager.vector2.release(vec);
    return result;
  }

  get bottomRight() {
    return this.position.add(this.size);
  }

  get center() {
    return this.size.div(2).add(this.position);
  }

  get edges() {
    const poolManager = PoolManager.getInstance();
    const topRight = this.topRight;
    const bottomRight = this.bottomRight;
    const bottomLeft = this.bottomLeft;
    return [
      poolManager.line.claim(this.topLeft, topRight),
      poolManager.line.claim(topRight, bottomRight),
      poolManager.line.claim(bottomRight, bottomLeft),
      poolManager.line.claim(bottomLeft, this.topLeft),
    ];
  }

  constructor(position: Vector2, size: Vector2) {
    super(position);
    this.size = size;
  }

  intersects(other: Shape): boolean {
    if (other instanceof Rectangle) {
      return !(
        other.position.x > this.position.x + this.size.x ||
        other.position.x + other.size.x < this.position.x ||
        other.position.y > this.position.y + this.size.y ||
        other.position.y + other.size.y < this.position.y
      );
    } else if (other instanceof Point) {
      return (
        other.position.x >= this.position.x &&
        other.position.x <= this.position.x + this.size.x &&
        other.position.y >= this.position.y &&
        other.position.y <= this.position.y + this.size.y
      );
    } else if (other instanceof Circle) {
      return other.intersects(this);
    } else if (other instanceof Line) {
      for (const edge of this.edges) {
        if (edge.intersects(other)) {
          return true;
        }
      }

      return (
        other.start.x >= this.position.x &&
        other.start.x <= this.position.x + this.size.x &&
        other.start.y >= this.position.y &&
        other.start.y <= this.position.y + this.size.y
      );
    }
    return false;
  }

  reset(position: Vector2, size: Vector2): this {
    this.position = position;
    this.size = size;
    return this;
  }
}

export { Point, Circle, Line, Rectangle };
export default Shape;
