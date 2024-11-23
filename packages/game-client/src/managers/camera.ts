import { Vector2 } from "@survive-the-night/game-server";

export class CameraManager {
  private ctx: CanvasRenderingContext2D;
  private position: Vector2 = { x: 0, y: 0 };
  private targetPosition: Vector2 = { x: 0, y: 0 };
  private readonly LERP_FACTOR = 0.05;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  translateTo(position: Vector2): void {
    this.targetPosition = position;

    // Lerp the current position towards the target
    this.position.x += (this.targetPosition.x - this.position.x) * this.LERP_FACTOR;
    this.position.y += (this.targetPosition.y - this.position.y) * this.LERP_FACTOR;

    const canvas = this.ctx.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const scale = 2;

    this.ctx.setTransform(
      scale,
      0,
      0,
      scale,
      Math.round(centerX - this.position.x * scale),
      Math.round(centerY - this.position.y * scale)
    );
  }
}
