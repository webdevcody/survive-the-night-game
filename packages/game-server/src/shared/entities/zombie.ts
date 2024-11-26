import {
  Direction,
  Collidable,
  Entity,
  Facing,
  Hitbox,
  Movable,
  Positionable,
  Updatable,
  Vector2,
  velocityTowards,
  Damageable,
  RawEntity,
} from "@survive-the-night/game-server";
import { Entities } from "@survive-the-night/game-server";
import { EntityManager } from "../../managers/entity-manager";

export class Zombie
  extends Entity
  implements Facing, Damageable, Movable, Positionable, Updatable, Collidable
{
  public facing = Direction.Right;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private static readonly ZOMBIE_WIDTH = 16;
  private static readonly ZOMBIE_HEIGHT = 16;
  private static readonly ZOMBIE_SPEED = 35;
  private health = 2;

  constructor(entityManager: EntityManager) {
    super(entityManager, Entities.ZOMBIE);
  }

  getCenterPosition(): Vector2 {
    return this.position;
  }

  getHitbox(): Hitbox {
    return {
      ...this.position,
      width: Zombie.ZOMBIE_WIDTH,
      height: Zombie.ZOMBIE_HEIGHT,
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

  damage(damage: number) {
    this.health -= damage;

    if (this.health <= 0) {
      this.getEntityManager().markEntityForRemoval(this);
    }
  }

  getHealth(): number {
    return this.health;
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      health: this.health,
      position: this.position,
      facing: this.facing,
      velocity: this.velocity,
    };
  }

  setPosition(position: Vector2) {
    this.position = position;
  }

  // TODO: this function is a copy one from Player.
  //   Would be better to merge them
  handleMovement(deltaTime: number) {
    const previousX = this.position.x;
    const previousY = this.position.y;

    this.position.x += this.velocity.x * deltaTime;

    if (this.getEntityManager().isColliding(this)) {
      this.position.x = previousX;
    }

    this.position.y += this.velocity.y * deltaTime;

    if (this.getEntityManager().isColliding(this)) {
      this.position.y = previousY;
    }
  }

  update(deltaTime: number) {
    const player = this.getEntityManager().getClosestPlayer(this);

    if (player === null) {
      return;
    }

    const newVelocity = velocityTowards(this.position, player.getPosition());
    this.velocity.x = newVelocity.x * Zombie.ZOMBIE_SPEED;
    this.velocity.y = newVelocity.y * Zombie.ZOMBIE_SPEED;

    this.handleMovement(deltaTime);
  }
}
