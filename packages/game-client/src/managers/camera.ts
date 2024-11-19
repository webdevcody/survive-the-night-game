import { Vector2 } from "@survive-the-night/game-server";

export class CameraManager {
  private ctx: CanvasRenderingContext2D;
  private position: Vector2 = { x: 0, y: 0 };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  translateTo(position: Vector2): void {
    const canvas = this.ctx.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Move camera to center player on screen by translating in opposite direction
    this.ctx.setTransform(
      1,
      0,
      0,
      1,
      Math.round(centerX - position.x),
      Math.round(centerY - position.y)
    );
    this.position = position;
  }
}
