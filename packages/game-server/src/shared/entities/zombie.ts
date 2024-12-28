import { EntityManager } from "../../managers/entity-manager";
import { MapManager } from "../../managers/map-manager";
import { Direction } from "../direction";
import { Entity, Entities, RawEntity } from "../entities";
import { Vector2, pathTowards, velocityTowards } from "../physics";
import {
  Damageable,
  Movable,
  PositionableTrait,
  Updatable,
  CollidableTrait,
  Hitbox,
} from "../traits";
import { Collidable, Destructible, Interactive, Inventory, Positionable } from "../extensions";
import { getHitboxWithPadding } from "./util";
import { Wall } from "./wall";
import { ZombieDeathEvent } from "../events/server-sent/zombie-death-event";
// import { ServerSocketManager } from "@/managers/server-socket-manager";
import { ZombieHurtEvent } from "../events/server-sent/zombie-hurt-event";
import Ignitable from "../extensions/ignitable";
import { ServerSocketManager } from "../../managers/server-socket-manager";

// TODO: refactor to use extensions
export class Zombie extends Entity implements Movable, Updatable, CollidableTrait {
  private static readonly ZOMBIE_WIDTH = 16;
  private static readonly ZOMBIE_HEIGHT = 16;
  private static readonly ZOMBIE_SPEED = 35;
  private static readonly POSITION_THRESHOLD = 1;
  private static readonly ATTACK_RADIUS = 24;
  private static readonly ATTACK_DAMAGE = 1;
  private static readonly ATTACK_COOLDOWN = 1000; // 1 second in milliseconds

  private currentWaypoint: Vector2 | null = null;
  private velocity: Vector2 = { x: 0, y: 0 };
  private health = 3;
  private mapManager: MapManager;
  private socketManager: ServerSocketManager;
  private lastAttackTime = 0;

  public facing = Direction.Right;

  constructor(
    entityManager: EntityManager,
    mapManager: MapManager,
    socketManager: ServerSocketManager
  ) {
    super(entityManager, Entities.ZOMBIE);
    this.mapManager = mapManager;
    this.socketManager = socketManager;

    const inventory = new Inventory(this, socketManager);
    inventory.addRandomItem(0.2);
    this.extensions.push(inventory);

    const destructible = new Destructible(this);
    destructible.setMaxHealth(3);
    destructible.setHealth(3);
    destructible.onDeath(this.onDeath.bind(this));
    this.extensions.push(destructible);

    this.extensions.push(new Positionable(this).setSize(Zombie.ZOMBIE_WIDTH));

    this.extensions.push(new Collidable(this));
  }

  getCenterPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    const position = positionable.getPosition();
    return {
      x: position.x + Zombie.ZOMBIE_WIDTH / 2,
      y: position.y + Zombie.ZOMBIE_HEIGHT / 2,
    };
  }

  static getHitbox(position: Vector2): Hitbox {
    return getHitboxWithPadding(position, 4);
  }

  getHitbox(): Hitbox {
    return Zombie.getHitbox(this.getPosition());
  }

  onDeath(): void {
    this.socketManager.broadcastEvent(new ZombieHurtEvent(this.getId()));
    this.extensions.push(new Interactive(this).onInteract(this.afterDeathInteract.bind(this)));
  }

  afterDeathInteract(): void {
    const inventory = this.getExt(Inventory);
    if (inventory) {
      inventory.scatterItems(this.getPosition());
    }

    this.getEntityManager().markEntityForRemoval(this);
    this.socketManager.broadcastEvent(new ZombieDeathEvent(this.getId()));
    this.getEntityManager().markEntityForRemoval(this);
  }

  setVelocity(velocity: Vector2) {
    this.velocity = velocity;
  }

  getVelocity(): Vector2 {
    return this.velocity;
  }

  getPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    const position = positionable.getPosition();
    return position;
  }

  serialize(): RawEntity {
    return {
      ...super.serialize(),
      health: this.health,
      facing: this.facing,
      velocity: this.velocity,
    };
  }

  setPosition(position: Vector2) {
    const positionable = this.getExt(Positionable);
    positionable.setPosition(position);
  }

  // TODO: this function is a copy one from Player.
  //   Would be better to merge them
  handleMovement(deltaTime: number) {
    const position = this.getPosition();
    const previousX = position.x;
    const previousY = position.y;

    position.x += this.velocity.x * deltaTime;

    if (this.getEntityManager().isColliding(this, [Entities.ZOMBIE])) {
      position.x = previousX;
    }

    position.y += this.velocity.y * deltaTime;

    if (this.getEntityManager().isColliding(this, [Entities.ZOMBIE])) {
      position.y = previousY;
    }

    this.setPosition(position);
  }

  private isAtWaypoint(): boolean {
    if (!this.currentWaypoint) return true;

    const dx = Math.abs(this.getCenterPosition().x - this.currentWaypoint.x);
    const dy = Math.abs(this.getCenterPosition().y - this.currentWaypoint.y);

    return dx <= Zombie.POSITION_THRESHOLD && dy <= Zombie.POSITION_THRESHOLD;
  }

  private attackNearbyPlayers() {
    const player = this.getEntityManager().getClosestAlivePlayer(this);
    if (!player) return;
    return this.attemptAttackEntity(player);
  }

  update(deltaTime: number) {
    const destructible = this.getExt(Destructible);
    if (destructible.isDead()) {
      return;
    }

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
    this.handleAttack(deltaTime);
  }

  private handleAttack(deltaTime: number) {
    if (!this.attackNearbyPlayers()) {
      this.attackNearbyWalls();
    }
  }

  private attackNearbyWalls() {
    const nearbyWalls = this.getEntityManager().getNearbyEntities(this.getPosition(), undefined, [
      Entities.WALL,
    ]) as Wall[];

    if (nearbyWalls.length > 0) {
      const nearbyWall = nearbyWalls[0];
      this.attemptAttackEntity(nearbyWall);
    }
  }

  private withinAttackRange(entity: Entity): boolean {
    const centerPosition =
      "getCenterPosition" in entity
        ? entity.getCenterPosition()
        : entity.getExt(Positionable).getCenterPosition();

    const distance = Math.hypot(
      centerPosition.x - this.getCenterPosition().x,
      centerPosition.y - this.getCenterPosition().y
    );

    return distance <= Zombie.ATTACK_RADIUS;
  }

  private attemptAttackEntity(entity: Entity) {
    const currentTime = Date.now();
    if (currentTime - this.lastAttackTime < Zombie.ATTACK_COOLDOWN) return;

    const withinRange = this.withinAttackRange(entity);
    if (!withinRange) return false;

    if ("damage" in entity) {
      entity.damage(Zombie.ATTACK_DAMAGE);
    } else {
      entity.getExt(Destructible).damage(Zombie.ATTACK_DAMAGE);
    }

    this.lastAttackTime = currentTime;
    return true;
  }
}
