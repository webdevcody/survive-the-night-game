import Vector2 from "@shared/util/vector2";

export class CameraManager {
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private position: Vector2 = new Vector2(0, 0);
  private targetPosition: Vector2 = new Vector2(0, 0);
  private readonly LERP_FACTOR = 0.04;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  getScale(): number {
    return this.scale;
  }

  setScale(scale: number): void {
    // Round scale to 0.1 precision to prevent sub-pixel rendering artifacts
    // This ensures tiles align properly without gaps
    this.scale = Math.round(scale * 10) / 10;
  }

  translateTo(position: Vector2): void {
    this.targetPosition = position;
    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 100) {
      this.position.x = this.targetPosition.x;
      this.position.y = this.targetPosition.y;
    } else {
      this.position.x += dx * this.LERP_FACTOR;
      this.position.y += dy * this.LERP_FACTOR;
    }

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
