export const BULLET_SPEED = 100;
import { EntityManager } from "../../managers/entity-manager";
import { Direction } from "../direction";
import { Entities } from "../entities";
import { Entity } from "../entities";
import { Vector2, normalizeDirection, normalizeVector } from "../physics";
import { Movable, Positionable, Updatable } from "../traits";

const MAX_TRAVEL_DISTANCE = 400;

export const HITBOX_RADIUS = 1;

export class Bullet extends Entity implements Positionable, Movable, Updatable {
  private traveledDistance: number = 0;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private static readonly BULLET_SPEED = 500;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.BULLET);
  }

  setDirection(direction: Direction) {
    const normalized = normalizeDirection(direction);

    this.velocity = {
      x: normalized.x * Bullet.BULLET_SPEED,
      y: normalized.y * Bullet.BULLET_SPEED,
    };
  }

  setDirectionFromVelocity(velocity: Vector2) {
    if (velocity.x === 0 && velocity.y === 0) {
      // Default direction (right) if no velocity
      this.velocity = { x: Bullet.BULLET_SPEED, y: 0 };
      return;
    }

    const normalized = normalizeVector(velocity);
    this.velocity = {
      x: normalized.x * Bullet.BULLET_SPEED,
      y: normalized.y * Bullet.BULLET_SPEED,
    };
  }

  update(deltaTime: number) {
    const oldPos = { ...this.position };
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    this.traveledDistance +=
      Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y) * deltaTime;

    if (this.traveledDistance > MAX_TRAVEL_DISTANCE) {
      this.getEntityManager().markEntityForRemoval(this);
    }
  }

  getPosition(): Vector2 {
    return this.position;
  }

  setPosition(position: Vector2) {
    this.position = position;
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  getVelocity(): Vector2 {
    return this.velocity;
  }

  setVelocity(velocity: Vector2) {
    this.velocity = velocity;
  }
}
