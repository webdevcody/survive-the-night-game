import { ImageLoader } from "@/managers/asset";
import { GameState } from "@/state";
import { Particle, ParticleTypes } from "./particle";

type ConfettiPiece = {
  offsetX: number;
  velocityX: number;
  velocityY: number;
  width: number;
  height: number;
  rotation: number;
  angularVelocity: number;
  color: string;
  swayAmplitude: number;
  swayPhase: number;
  swayFrequency: number;
};

const CONFETTI_COLORS = [
  "#ff5f6d",
  "#ffd166",
  "#06d6a0",
  "#4cc9f0",
  "#c77dff",
  "#ffffff",
];

export class ConfettiBurstParticle extends Particle {
  private readonly createdAt: number;
  private readonly durationMs = 1100;
  private readonly fadeStartProgress = 0.6;
  private readonly gravity = 180;
  private readonly pieces: ConfettiPiece[];

  constructor(imageLoader: ImageLoader, pieceCount: number = 20) {
    super(ParticleTypes.CONFETTI, imageLoader);
    this.createdAt = Date.now();
    this.pieces = Array.from({ length: pieceCount }, (_, index) => this.createPiece(index));
  }

  onInitialized(): void {
    // Purely visual, no sound or setup needed.
  }

  update(_deltaTime: number): void {
    // This particle is fully time-driven in render().
  }

  render(ctx: CanvasRenderingContext2D, _gameState: GameState): void {
    if (!this.getIsActive()) {
      return;
    }

    const elapsedMs = Date.now() - this.createdAt;
    if (elapsedMs >= this.durationMs) {
      this.setIsActive(false);
      return;
    }

    const progress = elapsedMs / this.durationMs;
    let alpha = 1;
    if (progress > this.fadeStartProgress) {
      alpha =
        1 - (progress - this.fadeStartProgress) / (1 - this.fadeStartProgress);
    }

    if (alpha <= 0) {
      this.setIsActive(false);
      return;
    }

    const t = elapsedMs / 1000;
    const origin = this.getPosition();

    ctx.save();
    ctx.globalAlpha = alpha;

    for (const piece of this.pieces) {
      const wobble = Math.sin(piece.swayPhase + t * piece.swayFrequency) * piece.swayAmplitude;
      const x = origin.x + piece.offsetX + piece.velocityX * t + wobble;
      const y = origin.y + piece.velocityY * t + 0.5 * this.gravity * t * t;
      const rotation = piece.rotation + piece.angularVelocity * t;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
      ctx.restore();
    }

    ctx.restore();
  }

  private createPiece(index: number): ConfettiPiece {
    return {
      offsetX: (Math.random() - 0.5) * 20,
      velocityX: (Math.random() - 0.5) * 70,
      velocityY: -(40 + Math.random() * 60),
      width: 1 + Math.random() * 1.5,
      height: 2 + Math.random() * 2.5,
      rotation: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 12,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      swayAmplitude: 0.5 + Math.random() * 2,
      swayPhase: Math.random() * Math.PI * 2,
      swayFrequency: 6 + Math.random() * 6,
    };
  }
}
