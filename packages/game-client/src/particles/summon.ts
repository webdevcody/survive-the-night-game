import { Particle, ParticleTypes } from "./particle";
import { GameState } from "@/state";
import { SOUND_TYPES_TO_MP3, SoundManager } from "@/managers/sound-manager";
import { ImageLoader } from "@/managers/asset";

export class SummonParticle extends Particle {
  private readonly durationMs = 650;
  private readonly createdAt: number;
  private readonly soundManager: SoundManager;

  constructor(imageLoader: ImageLoader, soundManager: SoundManager) {
    super(ParticleTypes.SUMMON, imageLoader);
    this.soundManager = soundManager;
    this.createdAt = Date.now();
  }

  onInitialized(): void {
    this.soundManager.playPositionalSound(
      SOUND_TYPES_TO_MP3.ZOMBIE_HURT,
      this.getPosition()
    );
  }

  render(ctx: CanvasRenderingContext2D, _gameState: GameState): void {
    const elapsed = Date.now() - this.createdAt;
    if (elapsed >= this.durationMs) {
      this.setIsActive(false);
      return;
    }

    const progress = elapsed / this.durationMs;
    const position = this.getPosition();
    const radius = 10 + progress * 20;
    const innerRadius = radius * 0.55;

    ctx.save();
    ctx.globalAlpha = 0.8 * (1 - progress);
    ctx.strokeStyle = "rgba(0, 255, 170, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(20, 120, 70, 0.35)";
    ctx.beginPath();
    ctx.arc(position.x, position.y, innerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
