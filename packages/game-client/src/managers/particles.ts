import { Particle } from "../particles/particle";
import { GameClient } from "@/client";

export class ParticleManager {
  private particles: Particle[];
  private gameClient: GameClient;

  constructor(gameClient: GameClient) {
    this.particles = [];
    this.gameClient = gameClient;
  }

  public addParticle(particle: Particle) {
    this.particles.push(particle);
  }

  public clear() {
    this.particles = [];
  }

  public render(ctx: CanvasRenderingContext2D) {
    this.particles.forEach((particle) => {
      particle.render(ctx, this.gameClient.getGameState());
    });

    this.particles = this.particles.filter((particle) => particle.getIsActive());
  }
}
