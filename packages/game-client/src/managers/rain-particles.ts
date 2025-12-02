import { RainParticle } from "@/particles/rain";
import { GameClient } from "@/client";
import { ImageLoader } from "@/managers/asset";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";

export class RainParticleManager {
  private gameClient: GameClient;
  private imageLoader: ImageLoader;
  private particles: RainParticle[] = [];
  private spawnAccumulator: number = 0; // Accumulator for continuous spawning
  private oscillationTime: number = 0; // Time accumulator for oscillation
  private readonly SPAWN_RADIUS = 800; // Spawn particles within 800 pixels of player (larger area)
  private readonly MAX_PARTICLES = 800; // Maximum number of active particles (more particles)
  private readonly BASE_SPAWN_RATE = 100; // Base particles per second
  private readonly OSCILLATION_AMPLITUDE = 30; // Variation in spawn rate (±30 particles/sec)
  private readonly OSCILLATION_PERIOD = 3.0; // Oscillation period in seconds
  private active: boolean = false;

  constructor(gameClient: GameClient, imageLoader: ImageLoader) {
    this.gameClient = gameClient;
    this.imageLoader = imageLoader;
  }

  public setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      this.clear();
    } else {
      // Reset accumulators when activating to start spawning immediately
      this.spawnAccumulator = 0;
      this.oscillationTime = 0;
    }
  }

  public isActive(): boolean {
    return this.active;
  }

  private spawnParticle(): void {
    const player = getPlayer(this.gameClient.getGameState());
    if (!player || !player.hasExt(ClientPositionable)) {
      return;
    }

    // Don't spawn if we have too many particles
    if (this.particles.length >= this.MAX_PARTICLES) {
      return;
    }

    const playerCenter = player.getExt(ClientPositionable).getCenterPosition();

    // Spawn particles above and to the left of the player (so they fall into view)
    const distance = this.SPAWN_RADIUS;
    const spawnX = playerCenter.x + (Math.random() - 0.5) * distance - distance * 0.3; // Offset left
    const spawnY = playerCenter.y - distance * 0.5 + (Math.random() - 0.5) * distance * 0.3; // Offset up

    // Random particle size (larger for visibility)
    const radius = 0.25 + Math.random() * 0.75; // Between 1.0 and 3.0 pixels

    const particle = new RainParticle(
      this.imageLoader,
      PoolManager.getInstance().vector2.claim(spawnX, spawnY),
      radius
    );

    particle.onInitialized();
    this.particles.push(particle);
    this.gameClient.getParticleManager().addParticle(particle);
  }

  public update(deltaSeconds: number): void {
    if (!this.active) {
      return;
    }

    // Update oscillation time
    this.oscillationTime += deltaSeconds;

    // Calculate oscillating spawn rate using sine wave
    // Oscillates between BASE_SPAWN_RATE - OSCILLATION_AMPLITUDE and BASE_SPAWN_RATE + OSCILLATION_AMPLITUDE
    const oscillation = Math.sin((this.oscillationTime / this.OSCILLATION_PERIOD) * Math.PI * 2);
    const currentSpawnRate = this.BASE_SPAWN_RATE + oscillation * this.OSCILLATION_AMPLITUDE;

    // Accumulate spawn count based on continuous rate
    this.spawnAccumulator += currentSpawnRate * deltaSeconds;

    // Spawn particles based on accumulated count
    const particlesToSpawn = Math.floor(this.spawnAccumulator);
    this.spawnAccumulator -= particlesToSpawn; // Keep fractional part

    // Spawn particles, but don't exceed max
    const availableSlots = this.MAX_PARTICLES - this.particles.length;
    const actualSpawnCount = Math.min(particlesToSpawn, availableSlots);

    for (let i = 0; i < actualSpawnCount; i++) {
      this.spawnParticle();
    }

    // Update all particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(deltaSeconds);

      // Remove inactive particles from our list
      if (!particle.getIsActive()) {
        this.particles.splice(i, 1);
      } else {
        // Check if particle is off-screen and despawn it
        const position = particle.getPosition();
        const player = getPlayer(this.gameClient.getGameState());
        if (player && player.hasExt(ClientPositionable)) {
          const playerCenter = player.getExt(ClientPositionable).getCenterPosition();
          const distance = Math.sqrt(
            Math.pow(position.x - playerCenter.x, 2) + Math.pow(position.y - playerCenter.y, 2)
          );
          // Despawn if too far from player
          if (distance > this.SPAWN_RADIUS * 1.5) {
            particle.setIsActive(false);
            this.particles.splice(i, 1);
          }
        }
      }
    }
  }

  public clear(): void {
    // Mark all particles as inactive
    for (const particle of this.particles) {
      particle.setIsActive(false);
    }
    this.particles = [];
  }
}
