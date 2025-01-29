export default class Vector2 {
  static readonly ZERO = new Vector2(0, 0);

  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(other: Vector2, axis?: "x" | "y"): Vector2 {
    if (axis === "x") {
      return new Vector2(this.x + other.x, this.y);
    } else if (axis === "y") {
      return new Vector2(this.x, this.y + other.y);
    }
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector2, axis?: "x" | "y"): Vector2 {
    if (axis === "x") {
      return new Vector2(this.x - other.x, this.y);
    } else if (axis === "y") {
      return new Vector2(this.x, this.y - other.y);
    }
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  mul(scalar: number): Vector2 {
    if (scalar === 0) {
      return new Vector2(0, 0);
    }
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  div(scalar: number): Vector2 {
    if (scalar === 0) {
      return new Vector2(0, 0);
    }
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  slide(normal: Vector2): Vector2 {
    if (this.length() === 0) {
      return this;
    }

    const projection = normal.mul(this.dot(normal));
    return new Vector2(this.x - 2 * projection.x, this.y - 2 * projection.y);
  }

  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  cross(other: Vector2): number {
    return this.x * other.y - this.y * other.x;
  }

  distance(other: Vector2): number {
    return Math.sqrt(this.distanceSquared(other));
  }

  distanceSquared(other: Vector2): number {
    return (this.x - other.x) ** 2 + (this.y - other.y) ** 2;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  angle(other: Vector2): number {
    const dotProduct = this.dot(other);
    const lengths = this.length() * other.length();
    if (lengths === 0) {
      throw new Error("Cannot calculate angle with zero-length vector.");
    }
    return Math.acos(dotProduct / lengths);
  }

  normalized(): Vector2 {
    const len = this.length();
    if (len === 0) return new Vector2(0, 0);
    return this.div(len);
  }

  closest(other: Vector2, size: Vector2): Vector2 {
    const closestX = Math.max(other.x, Math.min(this.x, other.x + size.x));
    const closestY = Math.max(other.y, Math.min(this.y, other.y + size.y));
    return new Vector2(closestX, closestY);
  }

  clone() {
    return new Vector2(this.x, this.y);
  }
}
