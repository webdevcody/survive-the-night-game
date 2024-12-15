import { EntityManager } from "../../managers/entity-manager.js";
import { Entity, Entities, RawEntity } from "../entities.js";
import { Collidable, Hitbox, Positionable, ServerOnly } from "../traits.js";
import { Vector2 } from "../physics.js";

export class Boundary extends Entity implements Collidable, Positionable, ServerOnly {
  private position: Vector2 = {
    x: 0,
    y: 0,
  };
  private size: Vector2 = {
    x: 16,
    y: 16,
  };

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.BOUNDARY);
  }

  isServerOnly(): boolean {
    return true;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  setPosition(position: Vector2): void {
    this.position = position;
  }

  setSize(size: Vector2): void {
    this.size = size;
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      position: this.position,
    };
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  getHitbox(): Hitbox {
    return {
      ...this.position,
      width: this.size.x,
      height: this.size.y,
    };
  }
}
