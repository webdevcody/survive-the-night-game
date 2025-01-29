import Vector2 from "./vector2";

abstract class Shape {
  readonly position: Vector2;

  constructor(position: Vector2) {
    this.position = position;
  }

  abstract intersects(other: Shape): boolean;
}

class Point extends Shape {
  intersects(other: Shape): boolean {
    if (other instanceof Point) {
      return this.position.x === other.position.x && this.position.y === other.position.y;
    } else if (other instanceof Circle || other instanceof Rectangle || other instanceof Line) {
      return other.intersects(this);
    }
    return false;
  }
}

class Line extends Shape {
  readonly start: Vector2;
  readonly end: Vector2;

  constructor(start: Vector2, end: Vector2) {
    super(start.add(end).div(2));
    this.start = start;
    this.end = end;
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
}

class Circle extends Shape {
  private readonly radius: number;

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
      const lineVector = other.end.sub(other.start);
      const pointVector = this.position.sub(other.start);
      const lineLengthSquared = lineVector.distanceSquared(new Vector2(0, 0));
      const t = Math.max(0, Math.min(1, pointVector.dot(lineVector) / lineLengthSquared));
      const closestPoint = other.start.add(lineVector.mul(t));
      return this.position.distanceSquared(closestPoint) <= this.radius * this.radius;
    }

    return false;
  }
}

class Rectangle extends Shape {
  readonly size: Vector2;

  get topLeft() {
    return this.position;
  }

  get topRight() {
    return this.position.add(new Vector2(this.size.x, 0));
  }

  get bottomLeft() {
    return this.position.add(new Vector2(0, this.size.y));
  }

  get bottomRight() {
    return this.position.add(this.size);
  }

  get center() {
    return this.size.div(2).add(this.position);
  }

  get edges() {
    return [
      new Line(this.topLeft, this.topRight),
      new Line(this.topRight, this.bottomRight),
      new Line(this.bottomRight, this.bottomLeft),
      new Line(this.bottomLeft, this.topLeft),
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
}

export { Point, Circle, Line, Rectangle };
export default Shape;
