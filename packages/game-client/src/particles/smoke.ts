import { Particle, ParticleTypes } from "./particle";
import { GameState } from "@/state";
import { ImageLoader } from "@/managers/asset";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";

export class SmokeParticle extends Particle {
  private createdAt: number;
  private radius: number;
  private hasStopped: boolean = false;
  private fadeStartTime: number = 0;
  private readonly BASE_FALL_DURATION = 2000; // 2 seconds of falling
  private readonly FALL_DURATION_VARIATION = 1000; // 1 second of variation
  private readonly FADE_DURATION = 3000; // 1 second fade after stopping
  private fallDuration: number; // Random fall duration
  // Turbulence properties for fluttering ash effect
  private turbulencePhase: number;
  private readonly TURBULENCE_FREQUENCY = 3.0; // Hz for fluttering motion
  private readonly TURBULENCE_AMPLITUDE = 8.0; // Pixels of flutter variation

  // Downward drift constant (slow falling speed)
  private readonly DOWNWARD_DRIFT_SPEED = 2.0; // Pixels per second

  constructor(
    imageLoader: ImageLoader,
    startPosition: Vector2,
    initialVelocity: Vector2,
    radius: number = 0.75 // Max 1 pixel, default 0.75
  ) {
    super(ParticleTypes.SMOKE, imageLoader);
    this.setPosition(startPosition);
    this.createdAt = Date.now();
    this.radius = Math.min(radius, 1.0); // Clamp to max 1 pixel
    // Random phase offset for independent fluttering behavior
    this.turbulencePhase = Math.random() * Math.PI * 2;
    this.fallDuration = this.BASE_FALL_DURATION + Math.random() * this.FALL_DURATION_VARIATION;
  }

  onInitialized(): void {
    // Nothing needed on initialization
  }

  public update(deltaTime: number, windTheta: number, windSpeed: number, windTime: number): void {
    if (!this.getIsActive()) return;

    const position = this.getPosition();
    const currentTime = Date.now();
    const elapsed = currentTime - this.createdAt;

    // If particle hasn't stopped falling yet, update physics
    if (!this.hasStopped) {
      // Check if fall duration has elapsed (2 seconds)
      if (elapsed >= this.fallDuration) {
        // Stop falling and start fade
        this.hasStopped = true;
        this.fadeStartTime = currentTime;
        return;
      }

      // Velocity-based movement: Velocity = Wind_Vector + Downward_Drift + Turbulence

      // Calculate current wind direction vector
      const windX = Math.cos(windTheta) * windSpeed;
      const windY = Math.sin(windTheta) * windSpeed;

      // Downward drift (constant slow falling speed)
      const downwardDriftY = this.DOWNWARD_DRIFT_SPEED;

      // Turbulence (fluttering motion using sine/cosine)
      const time = windTime + this.turbulencePhase;
      const turbulenceX =
        Math.sin(time * this.TURBULENCE_FREQUENCY * Math.PI * 2) * this.TURBULENCE_AMPLITUDE;
      const turbulenceY =
        Math.cos(time * this.TURBULENCE_FREQUENCY * Math.PI * 2) * this.TURBULENCE_AMPLITUDE;

      // Combine all velocity components
      const totalVelocityX = windX + turbulenceX;
      const totalVelocityY = windY + downwardDriftY + turbulenceY;

      // Apply velocity to position (velocity-based, not acceleration-based)
      const newX = position.x + totalVelocityX * deltaTime;
      const newY = position.y + totalVelocityY * deltaTime;

      this.setPosition(PoolManager.getInstance().vector2.claim(newX, newY));
    } else {
      // After stopping, check if fade duration has passed
      const fadeElapsed = currentTime - this.fadeStartTime;
      if (fadeElapsed >= this.FADE_DURATION) {
        this.setIsActive(false);
        return;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.getIsActive()) return;

    const position = this.getPosition();
    const currentTime = Date.now();

    let alpha = 1.0;
    let size = this.radius;

    if (this.hasStopped) {
      // Fade out after stopping
      const fadeElapsed = currentTime - this.fadeStartTime;
      const fadeProgress = Math.min(fadeElapsed / this.FADE_DURATION, 1.0);
      alpha = 1.0 - fadeProgress;
      size = this.radius * (1.0 - fadeProgress * 0.5); // Shrink slightly as it fades
    }

    if (alpha <= 0) {
      this.setIsActive(false);
      return;
    }

    // Draw square ash flake
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(40, 20, 20, ${alpha})`; // Dark grey ash color
    const halfSize = size;
    ctx.fillRect(position.x - halfSize, position.y - halfSize, size * 2, size * 2);
    ctx.restore();
  }
}
