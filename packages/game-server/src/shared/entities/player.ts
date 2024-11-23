import { Entity, Movable, Positionable, Updatable, Vector2 } from "@survive-the-night/game-server";
import { Entities } from "@survive-the-night/game-server";
import { Input } from "../../server";
import { EntityManager } from "../../managers/entity-manager";
import { Bullet } from "./bullet";

export const FIRE_COOLDOWN = 0.4;

export class Player extends Entity implements Movable, Positionable, Updatable {
  private fireCooldown = 0;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private input: Input = { dx: 0, dy: 0, harvest: false, fire: false };
  private static readonly PLAYER_WIDTH = 16;
  private static readonly PLAYER_HEIGHT = 16;
  private static readonly PLAYER_SPEED = 60;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.PLAYER);
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  setVelocityFromInput(dx: number, dy: number): void {
    // Normalize diagonal movement
    const normalizedDx = dx !== 0 && dy !== 0 ? dx / Math.sqrt(2) : dx;
    const normalizedDy = dx !== 0 && dy !== 0 ? dy / Math.sqrt(2) : dy;

    this.velocity = {
      x: normalizedDx * Player.PLAYER_SPEED,
      y: normalizedDy * Player.PLAYER_SPEED,
    };
  }

  setVelocity(velocity: Vector2) {
    this.velocity = velocity;
  }

  getVelocity(): Vector2 {
    return this.velocity;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  setPosition(position: Vector2) {
    this.position = position;
  }

  update(deltaTime: number) {
    this.fireCooldown -= deltaTime;

    if (this.input.fire && this.fireCooldown <= 0) {
      this.fireCooldown = FIRE_COOLDOWN;

      const bullet = new Bullet(this.getEntityManager());

      bullet.setPosition({
        x: this.position.x + Player.PLAYER_WIDTH / 2,
        y: this.position.y + Player.PLAYER_HEIGHT / 2,
      });

      bullet.setDirectionFromVelocity(this.velocity);

      console.log("Bullet created with velocity:", bullet.getVelocity());
      this.getEntityManager().addEntity(bullet);
    }
  }

  setInput(input: Input) {
    this.input = input;
  }
}
