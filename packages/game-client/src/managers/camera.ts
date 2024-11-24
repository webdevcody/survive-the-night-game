import { Vector2 } from "@survive-the-night/game-server";

export class CameraManager {
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private position: Vector2 = { x: 0, y: 0 };
  private targetPosition: Vector2 = { x: 0, y: 0 };
  private readonly LERP_FACTOR = 0.05;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  setScale(scale: number): void {
    this.scale = scale;
  }

  translateTo(position: Vector2): void {
    this.targetPosition = position;

    // Lerp the current position towards the target
    this.position.x += (this.targetPosition.x - this.position.x) * this.LERP_FACTOR;
    this.position.y += (this.targetPosition.y - this.position.y) * this.LERP_FACTOR;

    const canvas = this.ctx.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    this.ctx.setTransform(
      this.scale,
      0,
      0,
      this.scale,
      Math.round(centerX - this.position.x * this.scale),
      Math.round(centerY - this.position.y * this.scale)
    );
  }
}
