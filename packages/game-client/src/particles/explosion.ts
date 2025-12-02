import { ImageLoader } from "@/managers/asset";
import { GameState } from "@/state";
import { Z_INDEX } from "@shared/map";
import { getFrameIndex, Renderable } from "@/entities/util";
import { Particle, ParticleTypes } from "./particle";
import { SOUND_TYPES_TO_MP3, SoundManager } from "@/managers/sound-manager";

export class ExplosionParticle extends Particle implements Renderable {
  private duration: number;
  private frames: number;
  private createdAt: number;
  private soundManager: SoundManager;

  constructor(imageLoader: ImageLoader, soundManager: SoundManager) {
    super(ParticleTypes.EXPLOSION, imageLoader);
    this.duration = 400; // 400ms for explosion animation
    this.frames = 4;
    this.createdAt = Date.now();

    this.soundManager = soundManager;
  }

  public getZIndex(): number {
    return Z_INDEX.PROJECTILES;
  }

  onInitialized() {
    this.soundManager.playPositionalSound(SOUND_TYPES_TO_MP3.EXPLOSION, this.getPosition());
  }

  update(_deltaTime: number): void {
    // Animation is time-based in render, no update logic needed
  }

  render(ctx: CanvasRenderingContext2D, _gameState: GameState): void {
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
