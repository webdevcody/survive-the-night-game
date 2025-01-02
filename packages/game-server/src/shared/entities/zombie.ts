import { EntityManager } from "../../managers/entity-manager";
import { MapManager } from "../../managers/map-manager";
import { Entity, Entities } from "../entities";
import { Vector2, pathTowards, velocityTowards } from "../physics";
import { Hitbox } from "../traits";
import {
  Collidable,
  Destructible,
  Interactive,
  Inventory,
  Positionable,
  Updatable,
  Combustible,
  Movable,
  Illuminated,
} from "../extensions";
import { Wall } from "./wall";
import { ZombieDeathEvent } from "../events/server-sent/zombie-death-event";
import { ZombieHurtEvent } from "../events/server-sent/zombie-hurt-event";
import { ServerSocketManager } from "../../managers/server-socket-manager";
import { Cooldown } from "./util/cooldown";
import { Fire } from "./triggers/fire";

// TODO: refactor to use extensions
export class Zombie extends Entity {
  private static readonly ZOMBIE_WIDTH = 16;
  private static readonly ZOMBIE_HEIGHT = 16;
  private static readonly ZOMBIE_SPEED = 35;
  private static readonly POSITION_THRESHOLD = 1;
  private static readonly ATTACK_RADIUS = 24;
  private static readonly ATTACK_DAMAGE = 1;
  private static readonly ATTACK_COOLDOWN = 1;

  private currentWaypoint: Vector2 | null = null;
  private mapManager: MapManager;
  private socketManager: ServerSocketManager;
  private attackCooldown: Cooldown;

  constructor(
    entityManager: EntityManager,
    mapManager: MapManager,
    socketManager: ServerSocketManager
  ) {
    super(entityManager, Entities.ZOMBIE);

    this.attackCooldown = new Cooldown(Zombie.ATTACK_COOLDOWN);
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

    this.extensions.push(new Collidable(this).setSize(8).setOffset(4));
    this.extensions.push(new Movable(this));

    this.extensions.push(new Updatable(this, this.updateZombie.bind(this)));
    this.extensions.push(new Combustible(this, (type) => new Fire(this.getEntityManager())));
  }

  getCenterPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    const position = positionable.getPosition();
    return {
      x: position.x + Zombie.ZOMBIE_WIDTH / 2,
      y: position.y + Zombie.ZOMBIE_HEIGHT / 2,
    };
  }

  getHitbox(): Hitbox {
    const collidable = this.getExt(Collidable);
    return collidable.getHitBox();
  }

  onDeath(): void {
    this.socketManager.broadcastEvent(new ZombieHurtEvent(this.getId()));
    this.extensions.push(new Interactive(this).onInteract(this.afterDeathInteract.bind(this)));
    this.getExt(Combustible).onDeath();
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

  getPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    const position = positionable.getPosition();
    return position;
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

    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();

    position.x += velocity.x * deltaTime;

    if (this.getEntityManager().isColliding(this, [Entities.ZOMBIE])) {
      position.x = previousX;
    }

    position.y += velocity.y * deltaTime;

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

  updateZombie(deltaTime: number) {
    this.attackCooldown.update(deltaTime);

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

    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();

    // Update velocity to move towards waypoint if we have one
    if (this.currentWaypoint) {
      const velocityVector = velocityTowards(this.getCenterPosition(), this.currentWaypoint);
      velocity.x = velocityVector.x * Zombie.ZOMBIE_SPEED;
      velocity.y = velocityVector.y * Zombie.ZOMBIE_SPEED;
    } else {
      velocity.x = 0;
      velocity.y = 0;
    }

    movable.setVelocity(velocity);

    this.handleMovement(deltaTime);
    this.handleAttack();
  }

  private handleAttack() {
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
    const centerPosition = entity.hasExt(Positionable)
      ? entity.getExt(Positionable).getCenterPosition()
      : (entity as any).getCenterPosition();

    const distance = Math.hypot(
      centerPosition.x - this.getCenterPosition().x,
      centerPosition.y - this.getCenterPosition().y
    );

    return distance <= Zombie.ATTACK_RADIUS;
  }

  private attemptAttackEntity(entity: Entity) {
    if (!this.attackCooldown.isReady()) return;

    const withinRange = this.withinAttackRange(entity);
    if (!withinRange) return false;

    if (entity.hasExt(Destructible)) {
      entity.getExt(Destructible).damage(Zombie.ATTACK_DAMAGE);
    } else if ("damage" in entity && typeof (entity as any).damage === "function") {
      (entity as any).damage(Zombie.ATTACK_DAMAGE);
    }

    this.attackCooldown.reset();
    return true;
  }
}
