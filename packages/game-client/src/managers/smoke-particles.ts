import { SmokeParticle } from "@/particles/smoke";
import { GameClient } from "@/client";
import { ImageLoader } from "@/managers/asset";
import PoolManager from "@shared/util/pool-manager";
import { getPlayer } from "@/util/get-player";
import { ClientPositionable } from "@/extensions/positionable";

export class SmokeParticleManager {
  private gameClient: GameClient;
  private imageLoader: ImageLoader;
  private particles: SmokeParticle[] = [];
  private lastSpawnTime: number = 0;
  private readonly SPAWN_INTERVAL = 100; // Spawn a particle every 50ms
  private readonly SPAWN_RADIUS = 400; // Spawn particles within 900 pixels of player (screen corners)
  private readonly MAX_PARTICLES = 2000; // Maximum number of active particles
  private readonly MAX_PARTICLES_PER_SPAWN = 4; // Maximum number of particles to spawn per frame

  // Oscillating global wind system
  private windTheta: number = 0; // Wind angle in radians
  private windSpeed: number = 0.8; // Wind speed magnitude
  private windTime: number = 0; // Time accumulator for wind oscillation

  // Wind oscillation parameters
  private readonly BASE_WIND_THETA = Math.PI * 0.25; // Base wind angle (45 degrees)
  private readonly WIND_THETA_AMPLITUDE = Math.PI / 3; // ~60 degrees oscillation
  private readonly WIND_THETA_FREQUENCY = 0.15; // Hz (period ~6.7 seconds)

  private readonly BASE_WIND_SPEED = 30.0; // Base wind speed (pixels per second)
  private readonly WIND_SPEED_AMPLITUDE = 5.0; // Amplitude variation
  private readonly WIND_SPEED_FREQUENCY = 0.2; // Hz (period ~5 seconds)
  private readonly WIND_SPEED_PHASE_OFFSET = Math.PI * 0.5; // Phase offset for different oscillation

  constructor(gameClient: GameClient, imageLoader: ImageLoader) {
    this.gameClient = gameClient;
    this.imageLoader = imageLoader;
    this.lastSpawnTime = Date.now();
    // Initialize wind with random starting phase
    this.windTime = Math.random() * 10; // Random starting time for variety
  }

  private updateWindOscillation(deltaSeconds: number): void {
    // Update wind time accumulator
    this.windTime += deltaSeconds;

    // Calculate oscillating wind theta: baseTheta + amplitude * sin(time * frequency)
    this.windTheta =
      this.BASE_WIND_THETA +
      this.WIND_THETA_AMPLITUDE * Math.sin(this.windTime * this.WIND_THETA_FREQUENCY * Math.PI * 2);

    // Calculate oscillating wind speed: baseSpeed + amplitude * sin(time * frequency + phaseOffset)
    this.windSpeed =
      this.BASE_WIND_SPEED +
      this.WIND_SPEED_AMPLITUDE *
        Math.sin(
          this.windTime * this.WIND_SPEED_FREQUENCY * Math.PI * 2 + this.WIND_SPEED_PHASE_OFFSET
        );
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

    const distance = this.SPAWN_RADIUS;
    const spawnX = playerCenter.x + (Math.random() - 0.5) * distance;
    const spawnY = playerCenter.y + (Math.random() - 0.5) * distance;

    const windX = Math.cos(this.windTheta) * this.windSpeed;
    const windY = Math.sin(this.windTheta) * this.windSpeed;
    const initialVelocity = PoolManager.getInstance().vector2.claim(
      windX + (Math.random() - 0.5) * 0.1, // Wind direction + small random
      windY + (Math.random() - 0.5) * 0.1 // Wind direction + small random
    );

    // Random particle size (max 1 pixel)
    const radius = 0.5 + Math.random() * 0.5; // Between 0.5 and 1.0 pixels

    const particle = new SmokeParticle(
      this.imageLoader,
      PoolManager.getInstance().vector2.claim(spawnX, spawnY),
      initialVelocity,
      radius
    );

    particle.onInitialized();
    this.particles.push(particle);
    this.gameClient.getParticleManager().addParticle(particle);
  }

  public update(deltaSeconds: number): void {
    // Update wind oscillation
    this.updateWindOscillation(deltaSeconds);

    // Spawn new particles
    const currentTime = Date.now();
    if (currentTime - this.lastSpawnTime >= this.SPAWN_INTERVAL) {
      for (let i = 0; i < this.MAX_PARTICLES_PER_SPAWN; i++) {
        this.spawnParticle();
      }
      this.lastSpawnTime = currentTime;
    }

    // Update all particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(deltaSeconds, this.windTheta, this.windSpeed, this.windTime);

      // Remove inactive particles from our list
      if (!particle.getIsActive()) {
        this.particles.splice(i, 1);
      }
    }
  }

  public clear(): void {
    this.particles = [];
  }

  public getWindTheta(): number {
    return this.windTheta;
  }

  public getWindSpeed(): number {
    return this.windSpeed;
  }
}
