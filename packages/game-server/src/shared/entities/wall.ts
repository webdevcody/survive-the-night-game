import { EntityManager } from "@/managers/entity-manager";
import { Entity, Entities } from "../entities";
import { Collidable, Hitbox, Positionable } from "../traits";
import { Vector2 } from "../physics";

export class Wall extends Entity implements Collidable, Positionable {
  private position: Vector2 = {
    x: 0,
    y: 0,
  };

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.WALL);
  }

  getPosition(): Vector2 {
    return this.position;
  }

  setPosition(position: Vector2): void {
    this.position = position;
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  getHitbox(): Hitbox {
    return {
      ...this.position,
      width: 16,
      height: 16,
    };
  }
}
