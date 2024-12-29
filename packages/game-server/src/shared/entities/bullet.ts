export const BULLET_SPEED = 100;
import { EntityManager } from "../../managers/entity-manager";
import { Direction, normalizeDirection } from "../direction";
import { Entities, RawEntity } from "../entities";
import { Entity } from "../entities";
import { Destructible, Positionable, Movable, Updatable, Collidable } from "../extensions";
import { Vector2, distance, normalizeVector } from "../physics";
import { Damageable, DamageableKey, Hitbox, IntersectionMethodIdentifiers } from "../traits";

const MAX_TRAVEL_DISTANCE = 400;
export const HITBOX_RADIUS = 1;

export class Bullet extends Entity {
  private traveledDistance: number = 0;
  private static readonly BULLET_SPEED = 500;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.BULLET);

    this.extensions = [
      new Positionable(this),
      new Movable(this),
      new Updatable(this, this.updateBullet.bind(this)),
      new Collidable(this).setSize(1),
    ];
  }

  setDirection(direction: Direction) {
    const normalized = normalizeDirection(direction);
    this.getExt(Movable).setVelocity({
      x: normalized.x * Bullet.BULLET_SPEED,
      y: normalized.y * Bullet.BULLET_SPEED,
    });
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

    this.getExt(Movable).setVelocity({
      x: (rotatedX / length) * Bullet.BULLET_SPEED,
      y: (rotatedY / length) * Bullet.BULLET_SPEED,
    });
  }

  getHitbox(): Hitbox {
    return this.getExt(Collidable).getHitBox();
  }

  setDirectionFromVelocity(velocity: Vector2) {
    if (velocity.x === 0 && velocity.y === 0) {
      // Default direction (right) if no velocity
      this.getExt(Movable).setVelocity({ x: Bullet.BULLET_SPEED, y: 0 });
      return;
    }

    const normalized = normalizeVector(velocity);
    this.getExt(Movable).setVelocity({
      x: normalized.x * Bullet.BULLET_SPEED,
      y: normalized.y * Bullet.BULLET_SPEED,
    });
  }

  private updateBullet(deltaTime: number) {
    const lastPosition = { ...this.getPosition() };
    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();
    const positionable = this.getExt(Positionable);

    positionable.setPosition({
      x: positionable.getPosition().x + velocity.x * deltaTime,
      y: positionable.getPosition().y + velocity.y * deltaTime,
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
      } else if (intersectingEntity.hasExt(Destructible)) {
        const destructible = intersectingEntity.getExt(Destructible);
        destructible.damage(1);
      }
    }
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      position: this.getPosition(),
      velocity: this.getVelocity(),
    };
  }

  getPosition(): Vector2 {
    return this.getExt(Positionable).getPosition();
  }

  setPosition(position: Vector2) {
    this.getExt(Positionable).setPosition(position);
  }

  getCenterPosition(): Vector2 {
    return this.getPosition();
  }

  getVelocity(): Vector2 {
    return this.getExt(Movable).getVelocity();
  }

  setVelocity(velocity: Vector2) {
    this.getExt(Movable).setVelocity(velocity);
  }
}
