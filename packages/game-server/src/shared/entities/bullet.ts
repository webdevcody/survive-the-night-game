import { Entities } from "@survive-the-night/game-shared/src/constants";
import { IEntityManager, IGameManagers } from "../../managers/types";
import { Direction, normalizeDirection } from "../direction";
import { Entity } from "../entity";
import Collidable from "../extensions/collidable";
import Destructible from "../extensions/destructible";
import Groupable from "../extensions/groupable";
import Movable from "../extensions/movable";
import Positionable from "../extensions/positionable";
import Updatable from "../extensions/updatable";
import { Vector2, distance, normalizeVector } from "../physics";
import { Hitbox } from "../traits";
import { RawEntity } from "@survive-the-night/game-shared/src/types/entity";
import { IEntity } from "../types";
import { ZombieHurtEvent } from "../events/server-sent/zombie-hurt-event";

const MAX_TRAVEL_DISTANCE = 400;
export const BULLET_SPEED = 100;
export const HITBOX_RADIUS = 1;

export class Bullet extends Entity {
  private traveledDistance: number = 0;
  private static readonly BULLET_SPEED = 500;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.BULLET);

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
    const lastPosition = this.updatePositions(deltaTime);
    this.handleMaxDistanceLogic(lastPosition);
    this.handleIntersections();
  }

  private updatePositions(deltaTime: number) {
    const lastPosition = { ...this.getPosition() };
    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();
    const positionable = this.getExt(Positionable);

    positionable.setPosition({
      x: positionable.getPosition().x + velocity.x * deltaTime,
      y: positionable.getPosition().y + velocity.y * deltaTime,
    });
    return lastPosition;
  }

  private handleIntersections() {
    // TODO: find a helper function for this
    const isEnemy = (entity: IEntity) =>
      entity.hasExt(Groupable) && entity.getExt(Groupable).getGroup() === "enemy";

    const enemies = this.getEntityManager()
      .getNearbyIntersectingDestructableEntities(this, this.getHitbox())
      .filter(isEnemy);

    if (enemies.length > 0) {
      const firstEnemy = enemies[0];
      this.getEntityManager().markEntityForRemoval(this);
      const destructible = firstEnemy.getExt(Destructible);
      destructible.damage(1);

      if (firstEnemy.getType() === Entities.ZOMBIE) {
        this.getGameManagers()
          .getBroadcaster()
          .broadcastEvent(new ZombieHurtEvent(firstEnemy.getId()));
      }
    }
  }

  private handleMaxDistanceLogic(lastPosition: { x: number; y: number }) {
    this.traveledDistance += distance(lastPosition, this.getPosition());

    if (this.traveledDistance > MAX_TRAVEL_DISTANCE) {
      this.getEntityManager().markEntityForRemoval(this);
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
