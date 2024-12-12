import { EntityManager } from "../../managers/entity-manager";
import { MapManager } from "../../managers/map-manager";
import { Direction } from "../direction";
import { Entity, Entities, RawEntity } from "../entities";
import { Vector2, pathTowards, velocityTowards } from "../physics";
import { Damageable, Movable, Positionable, Updatable, Collidable, Hitbox } from "../traits";
import { getHitboxWithPadding } from "./util";

export class Zombie
  extends Entity
  implements Damageable, Movable, Positionable, Updatable, Collidable, Damageable
{
  public facing = Direction.Right;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private static readonly ZOMBIE_WIDTH = 16;
  private static readonly ZOMBIE_HEIGHT = 16;
  private static readonly ZOMBIE_SPEED = 35;
  private health = 3;
  private mapManager: MapManager;
  private currentWaypoint: Vector2 | null = null;
  private static readonly POSITION_THRESHOLD = 1;
  private static readonly ATTACK_RADIUS = 24;
  private static readonly ATTACK_DAMAGE = 1;
  private static readonly ATTACK_COOLDOWN = 1000; // 1 second in milliseconds
  private lastAttackTime = 0;

  constructor(entityManager: EntityManager, mapManager: MapManager) {
    super(entityManager, Entities.ZOMBIE);
    this.mapManager = mapManager;
  }

  getCenterPosition(): Vector2 {
    return {
      x: this.position.x + Zombie.ZOMBIE_WIDTH / 2,
      y: this.position.y + Zombie.ZOMBIE_HEIGHT / 2,
    };
  }

  getHitbox(): Hitbox {
    return Zombie.getHitbox(this.position);
  }

  getMaxHealth(): number {
    return 3;
  }

  getDamageBox(): Hitbox {
    return Zombie.getDamageBox(this.position);
  }

  static getDamageBox(position: Vector2): Hitbox {
    return getHitboxWithPadding(position, 0);
  }

  static getHitbox(position: Vector2): Hitbox {
    return getHitboxWithPadding(position, 4);
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

    if (this.getEntityManager().isColliding(this, [Entities.ZOMBIE])) {
      this.position.x = previousX;
    }

    this.position.y += this.velocity.y * deltaTime;

    if (this.getEntityManager().isColliding(this, [Entities.ZOMBIE])) {
      this.position.y = previousY;
    }
  }

  private isAtWaypoint(): boolean {
    if (!this.currentWaypoint) return true;

    const dx = Math.abs(this.getCenterPosition().x - this.currentWaypoint.x);
    const dy = Math.abs(this.getCenterPosition().y - this.currentWaypoint.y);

    return dx <= Zombie.POSITION_THRESHOLD && dy <= Zombie.POSITION_THRESHOLD;
  }

  private attackNearbyPlayer() {
    const player = this.getEntityManager().getClosestAlivePlayer(this);
    if (!player) return;

    const currentTime = Date.now();
    if (currentTime - this.lastAttackTime < Zombie.ATTACK_COOLDOWN) return;

    const distance = Math.hypot(
      player.getCenterPosition().x - this.getCenterPosition().x,
      player.getCenterPosition().y - this.getCenterPosition().y
    );

    if (distance <= Zombie.ATTACK_RADIUS) {
      player.damage(Zombie.ATTACK_DAMAGE);
      this.lastAttackTime = currentTime;
    }
  }

  update(deltaTime: number) {
    const player = this.getEntityManager().getClosestAlivePlayer(this);
    if (!player) return;

    // Get new waypoint when we reach the current one or don't have one
    if (this.isAtWaypoint()) {
      this.currentWaypoint = pathTowards(
        this.getCenterPosition(),
        player.getCenterPosition(),
        this.mapManager.getMap()
      );
    }

    // Update velocity to move towards waypoint if we have one
    if (this.currentWaypoint) {
      const velocityVector = velocityTowards(this.getCenterPosition(), this.currentWaypoint);
      this.velocity.x = velocityVector.x * Zombie.ZOMBIE_SPEED;
      this.velocity.y = velocityVector.y * Zombie.ZOMBIE_SPEED;
    } else {
      this.velocity.x = 0;
      this.velocity.y = 0;
    }

    this.handleMovement(deltaTime);

    // Add attack check
    this.attackNearbyPlayer();
  }
}
