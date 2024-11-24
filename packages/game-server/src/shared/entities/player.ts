import {
  Collidable,
  Entity,
  Hitbox,
  Movable,
  Positionable,
  Updatable,
  Vector2,
  normalizeVector,
} from "@survive-the-night/game-server";
import { Entities } from "@survive-the-night/game-server";
import { Input } from "../../server";
import { EntityManager } from "../../managers/entity-manager";
import { Bullet } from "./bullet";

export const FIRE_COOLDOWN = 0.4;

export class Player extends Entity implements Movable, Positionable, Updatable, Collidable {
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

  getHitbox(): Hitbox {
    return {
      ...this.position,
      width: Player.PLAYER_WIDTH,
      height: Player.PLAYER_HEIGHT,
    };
  }

  setVelocityFromInput(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      this.velocity = { x: 0, y: 0 };
      return;
    }

    const normalized = normalizeVector({ x: dx, y: dy });
    this.velocity = {
      x: normalized.x * Player.PLAYER_SPEED,
      y: normalized.y * Player.PLAYER_SPEED,
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

  handleAttack(deltaTime: number) {
    this.fireCooldown -= deltaTime;

    if (this.input.fire && this.fireCooldown <= 0) {
      this.fireCooldown = FIRE_COOLDOWN;

      const bullet = new Bullet(this.getEntityManager());
      bullet.setPosition({
        x: this.position.x + Player.PLAYER_WIDTH / 2,
        y: this.position.y + Player.PLAYER_HEIGHT / 2,
      });
      bullet.setDirectionFromVelocity(this.velocity);
      this.getEntityManager().addEntity(bullet);
    }
  }

  handleMovement(deltaTime: number) {
    const velocity = this.getVelocity();

    const previousX = this.getPosition().x;
    const previousY = this.getPosition().y;

    const currentPosition = { ...this.getPosition() };

    currentPosition.x += velocity.x * deltaTime;
    this.setPosition(currentPosition);
    if (this.getEntityManager().isColliding(this)) {
      currentPosition.x = previousX;
      this.setPosition(currentPosition);
    }

    currentPosition.y += velocity.y * deltaTime;
    this.setPosition(currentPosition);
    if (this.getEntityManager().isColliding(this)) {
      currentPosition.y = previousY;
      this.setPosition(currentPosition);
    }

    this.setPosition(currentPosition);
  }

  update(deltaTime: number) {
    this.handleAttack(deltaTime);
    this.handleMovement(deltaTime);
  }

  setInput(input: Input) {
    this.input = input;
  }
}
