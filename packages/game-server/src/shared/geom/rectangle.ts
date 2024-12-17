import { Vector2 } from "../physics";

export class Rectangle {
  public x: number;
  public y: number;
  public width: number;
  public height: number;

  public constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  public getCenter(): Vector2 {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    };
  }

  public getSize(): Vector2 {
    return {
      x: this.width,
      y: this.height,
    };
  }

  public isOverlapping(other: Rectangle): boolean {
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }
}
