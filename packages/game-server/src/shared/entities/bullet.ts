export const BULLET_SPEED = 100;
import { EntityManager } from "../../managers/entity-manager";
import { Direction, normalizeDirection } from "../direction";
import { Entities, RawEntity } from "../entities";
import { Entity } from "../entities";
import { Vector2, distance, normalizeVector } from "../physics";
import {
  Collidable,
  Damageable,
  DamageableKey,
  Hitbox,
  IntersectionMethodIdentifiers,
  Movable,
  Positionable,
  Updatable,
} from "../traits";

const MAX_TRAVEL_DISTANCE = 400;

export const HITBOX_RADIUS = 1;

export class Bullet extends Entity implements Positionable, Movable, Updatable, Collidable {
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

  setDirectionWithOffset(direction: Direction, offsetAngle: number) {
    const normalized = normalizeDirection(direction);

    // Convert offsetAngle from degrees to radians
    const radians = (offsetAngle * Math.PI) / 180;

    // Apply rotation to the normalized vector
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    const rotatedX = normalized.x * cos - normalized.y * sin;
    const rotatedY = normalized.x * sin + normalized.y * cos;

    // Normalize the rotated vector
    const length = Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY);

    this.velocity = {
      x: (rotatedX / length) * Bullet.BULLET_SPEED,
      y: (rotatedY / length) * Bullet.BULLET_SPEED,
    };
  }

  getHitbox(): Hitbox {
    return {
      ...this.position,
      width: 1,
      height: 1,
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
    const lastPosition = { ...this.getPosition() };
    this.setPosition({
      x: this.position.x + this.velocity.x * deltaTime,
      y: this.position.y + this.velocity.y * deltaTime,
    });

    this.traveledDistance += distance(lastPosition, this.getPosition());

    if (this.traveledDistance > MAX_TRAVEL_DISTANCE) {
      this.getEntityManager().markEntityForRemoval(this);
    }

    const intersectingEntity = this.getEntityManager().getIntersectingEntityByType(
      this,
      IntersectionMethodIdentifiers.Damageable,
      [Entities.WALL]
    );
    if (intersectingEntity) {
      this.getEntityManager().markEntityForRemoval(this);
      if (DamageableKey in intersectingEntity) {
        const damageable = intersectingEntity as unknown as Damageable;
        damageable.damage(1);
      }
    }
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      position: this.position,
      velocity: this.velocity,
    };
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
