export default class Vector2 {
  static readonly ZERO = new Vector2(0, 0);

  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(other: Vector2, axis?: "x" | "y"): this {
    if (axis === "x") {
      this.x += other.x;
    } else if (axis === "y") {
      this.y += other.y;
    } else {
      this.x += other.x;
      this.y += other.y;
    }
    return this;
  }

  sub(other: Vector2, axis?: "x" | "y"): this {
    if (axis === "x") {
      this.x -= other.x;
    } else if (axis === "y") {
      this.y -= other.y;
    } else {
      this.x -= other.x;
      this.y -= other.y;
    }
    return this;
  }

  mul(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  div(scalar: number): this {
    if (scalar === 0) {
      throw new Error("Cannot divide by zero.");
    }
    this.x /= scalar;
    this.y /= scalar;
    return this;
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

  unit(): this {
    const len = this.length();
    if (len === 0) {
      throw new Error("Cannot create a unit vector from a zero-length vector.");
    }
    return this.div(len);
  }

  closest(other: Vector2, size: Vector2): this {
    const closestX = Math.max(other.x, Math.min(this.x, other.x + size.x));
    const closestY = Math.max(other.y, Math.min(this.y, other.y + size.y));
    this.x = closestX;
    this.y = closestY;
    return this;
  }

  clone() {
    return new Vector2(this.x, this.y);
  }

  reset(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
}
