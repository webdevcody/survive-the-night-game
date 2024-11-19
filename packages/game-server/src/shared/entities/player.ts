import { Entity, Vector2 } from "@survive-the-night/game-server";
import { Entities } from "@survive-the-night/game-server";

export class Player extends Entity {
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };

  constructor(id: string) {
    super(Entities.PLAYER, id);
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
}
