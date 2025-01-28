import { ImageLoader } from "@/managers/asset";
import { GameState } from "@/state";
import { Z_INDEX } from "@shared/map";
import { getFrameIndex, Renderable } from "@/entities/util";
import { Particle, ParticleTypes } from "./particle";

export class ExplosionParticle extends Particle implements Renderable {
  private duration: number;
  private frames: number;
  private createdAt: number;

  constructor(imageLoader: ImageLoader) {
    super(ParticleTypes.EXPLOSION, imageLoader);
    this.duration = 400; // 400ms for explosion animation
    this.frames = 4;
    this.createdAt = Date.now();
  }

  public getZIndex(): number {
    return Z_INDEX.PROJECTILES;
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const position = this.getPosition();
    const elapsed = Date.now() - this.createdAt;

    // Don't render if animation is complete
    if (elapsed >= this.duration) {
      this.setIsActive(false);
      return;
    }

    const frameIndex = getFrameIndex(this.createdAt, {
      duration: this.duration,
      frames: this.frames,
    });

    const image = this.getImageLoader().get(`explosion_${frameIndex}` as any);
    const offset = 16; // Center the explosion

    ctx.drawImage(
      image,
      position.x - offset,
      position.y - offset,
      image.width * 2,
      image.height * 2
    );
  }
}
