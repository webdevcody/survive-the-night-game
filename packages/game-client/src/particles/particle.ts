import { ImageLoader } from "@/managers/asset";
import { GameState } from "@/state";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";

export const ParticleTypes = {
  SWING: "swipe",
  ZOMBIE_SWING: "zombie_swing",
  EXPLOSION: "explosion",
  SUMMON: "summon",
  SMOKE: "smoke",
} as const;

export type ParticleType = (typeof ParticleTypes)[keyof typeof ParticleTypes];

export abstract class Particle {
  public type: ParticleType;
  private imageLoader: ImageLoader;
  private position: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private isActive: boolean = true;

  constructor(type: ParticleType, imageLoader: ImageLoader) {
    this.type = type;
    this.imageLoader = imageLoader;
  }

  public getPosition(): Vector2 {
    return this.position.clone();
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public setPosition(position: Vector2) {
    this.position.reset(position.x, position.y);
  }

  public getImageLoader(): ImageLoader {
    return this.imageLoader;
  }

  public setIsActive(isActive: boolean) {
    this.isActive = isActive;
  }

  public abstract render(ctx: CanvasRenderingContext2D, gameState: GameState): void;
  public abstract onInitialized(): void;
}
