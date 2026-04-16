import { ImageLoader } from "@/managers/asset";
import { GameState } from "@/state";
import Vector2 from "@shared/util/vector2";
import { Particle, ParticleTypes } from "./particle";

/** Short world-space “MISS” when a player evades zombie damage. */
export class MissTextParticle extends Particle {
  private readonly createdAt: number;
  private readonly durationMs = 550;
  private readonly risePx = 20;

  constructor(imageLoader: ImageLoader, worldCenter: Vector2) {
    super(ParticleTypes.MISS_TEXT, imageLoader);
    this.setPosition(worldCenter);
    this.createdAt = Date.now();
  }

  onInitialized(): void {}

  update(_deltaTime: number): void {}

  render(ctx: CanvasRenderingContext2D, _gameState: GameState): void {
    const elapsed = Date.now() - this.createdAt;
    if (elapsed >= this.durationMs) {
      this.setIsActive(false);
      return;
    }

    const t = elapsed / this.durationMs;
    const pos = this.getPosition();
    const y = pos.y - 6 - this.risePx * t;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(210, 225, 255, 0.95)";
    ctx.fillText("MISS", pos.x, y);
    ctx.restore();
  }
}
