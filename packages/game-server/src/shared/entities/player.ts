import { Entity, Vector2 } from "@survive-the-night/game-server";
import { Entities } from "@survive-the-night/game-server";
import { Input } from "../../server";
import { EntityManager } from "../../managers/entity-manager";
import { Bullet } from "./bullet";

export const FIRE_COOLDOWN = 400;

export class Player extends Entity {
  private fireCooldown = FIRE_COOLDOWN;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private input: Input = { dx: 0, dy: 0, harvest: false, fire: false };

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.PLAYER);
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
      this.getEntityManager().addEntity(new Bullet(this.getEntityManager()));
    }
  }

  setInput(input: Input) {
    this.input = input;
  }
}
