export const BULLET_SPEED = 100;
import { EntityManager } from "../../managers/entity-manager";
import { Entities } from "../entities";
import { Entity } from "../entities";
import { Vector2 } from "../physics";
import { Movable, Positionable } from "../traits";

const MAX_TRAVEL_DISTANCE = 1000;

export class Bullet extends Entity implements Positionable, Movable {
  private traveledDistance: number = 0;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.BULLET);
  }

  update(deltaTime: number) {
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.traveledDistance += Math.sqrt(
      this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
    );
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
