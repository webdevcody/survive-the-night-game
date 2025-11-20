import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";

export class CameraManager {
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private position: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private targetPosition: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private readonly LERP_FACTOR = 0.04;
  private shakeOffset: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private shakeMagnitude: number = 0;
  private shakeDurationMs: number = 0;
  private shakeStartTime: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  getPosition(): Vector2 {
    const poolManager = PoolManager.getInstance();
    return poolManager.vector2.claim(this.position.x + this.shakeOffset.x, this.position.y + this.shakeOffset.y);
  }

  getScale(): number {
    return this.scale;
  }

  setScale(scale: number): void {
    // Round scale to 0.1 precision to prevent sub-pixel rendering artifacts
    // This ensures tiles align properly without gaps
    this.scale = Math.round(scale * 10) / 10;
  }

  public shake(intensity: number, durationMs: number): void {
    if (intensity <= 0 || durationMs <= 0) {
      return;
    }
    const clampedIntensity = Math.min(intensity, 6);
    this.shakeMagnitude = Math.max(this.shakeMagnitude, clampedIntensity);
    this.shakeDurationMs = Math.max(this.shakeDurationMs, durationMs);
    this.shakeStartTime = performance.now();
  }

  private updateShake(): void {
    if (!this.shakeDurationMs) {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
      return;
    }

    const now = performance.now();
    const elapsed = now - this.shakeStartTime;

    if (elapsed >= this.shakeDurationMs) {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
      this.shakeDurationMs = 0;
      this.shakeMagnitude = 0;
      return;
    }

    const falloff = 1 - elapsed / this.shakeDurationMs;
    const magnitude = this.shakeMagnitude * falloff;
    this.shakeOffset.x = (Math.random() * 2 - 1) * magnitude;
    this.shakeOffset.y = (Math.random() * 2 - 1) * magnitude;
  }

  translateTo(position: Vector2, dt?: number): void {
    this.targetPosition = position;
    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 100) {
      this.position.x = this.targetPosition.x;
      this.position.y = this.targetPosition.y;
    } else {
      // Use time-based lerp if dt is provided, otherwise fallback to constant factor
      // Original factor was 0.04
      // 0.04 = 1 - exp(-lambda * 0.0166) -> lambda ~ 2.5
      let factor = this.LERP_FACTOR;
      
      if (dt !== undefined && dt > 0) {
        const lambda = 2.5;
        factor = 1 - Math.exp(-lambda * dt);
      }

      this.position.x += dx * factor;
      this.position.y += dy * factor;
    }

    this.updateShake();

    const canvas = this.ctx.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const renderX = this.position.x + this.shakeOffset.x;
    const renderY = this.position.y + this.shakeOffset.y;

    this.ctx.setTransform(
      this.scale,
      0,
      0,
      this.scale,
      Math.round(centerX - renderX * this.scale),
      Math.round(centerY - renderY * this.scale)
    );
  }
}
