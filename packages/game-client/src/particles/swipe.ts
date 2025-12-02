import { ImageLoader } from "@/managers/asset";
import { GameState } from "@/state";
import { Z_INDEX } from "@shared/map";
import { getFrameIndex, Renderable } from "@/entities/util";
import { Direction } from "@shared/util/direction";
import { Particle, ParticleTypes } from "./particle";

type SwipeType = "zombie" | "player";

export class SwipeParticle extends Particle implements Renderable {
  private direction: Direction;
  private duration: number;
  private frames: number;
  private createdAt: number;
  private swipeType: SwipeType;

  constructor(imageLoader: ImageLoader, direction: Direction, swipeType: SwipeType) {
    super(ParticleTypes.SWING, imageLoader);
    this.direction = direction;
    this.duration = 150;
    this.frames = 4;
    this.createdAt = Date.now();
    this.swipeType = swipeType;
  }

  public getZIndex(): number {
    return Z_INDEX.PROJECTILES;
  }

  onInitialized(): void {
    // No initialization sound or effect needed for swipe particle
  }

  update(_deltaTime: number): void {
    // Animation is time-based in render, no update logic needed
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

    const image = this.getImageLoader().getFrameWithDirection(
      this.swipeType === "zombie" ? "zombie_swing" : ("swing" as any),
      this.direction,
      frameIndex
    );
    const offset = 8;

    if (this.direction === Direction.Down) {
      ctx.drawImage(image, position.x - offset, position.y + offset);
    } else if (this.direction === Direction.Up) {
      ctx.drawImage(image, position.x - offset, position.y - offset * 2);
    } else if (this.direction === Direction.Left) {
      ctx.drawImage(image, position.x - offset * 2, position.y - offset);
    } else if (this.direction === Direction.Right) {
      ctx.drawImage(image, position.x + offset, position.y - offset);
    }
  }
}
