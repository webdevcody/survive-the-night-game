import { Particle, ParticleTypes } from "./particle";
import { GameState } from "@/state";
import { ImageLoader } from "@/managers/asset";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";

export class RainParticle extends Particle {
  private createdAt: number;
  private radius: number;
  private velocity: Vector2;
  private readonly FALL_SPEED = 200; // Pixels per second (downward)
  private readonly DRIFT_SPEED = 50; // Pixels per second (rightward)

  constructor(imageLoader: ImageLoader, startPosition: Vector2, radius: number = 0.5) {
    super(ParticleTypes.RAIN, imageLoader);
    this.setPosition(startPosition);
    this.createdAt = Date.now();
    this.radius = radius;

    // Velocity is down-right direction
    const poolManager = PoolManager.getInstance();
    this.velocity = poolManager.vector2.claim(this.DRIFT_SPEED, this.FALL_SPEED);
  }

  onInitialized(): void {
    // Nothing needed on initialization
  }

  public update(deltaTime: number): void {
    if (!this.getIsActive()) return;

    const position = this.getPosition();

    // Simple linear movement down-right
    const newX = position.x + this.velocity.x * deltaTime;
    const newY = position.y + this.velocity.y * deltaTime;

    this.setPosition(PoolManager.getInstance().vector2.claim(newX, newY));

    // Despawn if off-screen (we'll check bounds in manager)
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.getIsActive()) return;

    const position = this.getPosition();

    // Draw white rain drop (larger and brighter for visibility)
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
    const halfSize = this.radius;
    // Draw a line instead of a square for better rain effect
    ctx.strokeStyle = `rgba(255, 255, 255, 0.9)`;
    ctx.lineWidth = Math.max(0.25, this.radius);
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
    ctx.lineTo(position.x + this.velocity.x * 0.1, position.y + this.velocity.y * 0.1);
    ctx.stroke();
    ctx.restore();
  }

  public getVelocity(): Vector2 {
    return this.velocity;
  }
}
