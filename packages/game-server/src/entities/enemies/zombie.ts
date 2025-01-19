import { IGameManagers } from "@/managers/types";
import { Wall } from "@/entities/items/wall";
import { ZombieDeathEvent } from "@shared/events/server-sent/zombie-death-event";
import { Cooldown } from "@/entities/util/cooldown";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import { pathTowards, velocityTowards } from "@/util/physics";
import { IEntity } from "@/entities/types";
import { LootEvent } from "@/events/server-sent/loot-event";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";

export class Zombie extends Entity {
  public static readonly Size = new Vector2(16, 16);

  private static readonly ZOMBIE_SPEED = 35;
  private static readonly POSITION_THRESHOLD = 1;
  private static readonly ATTACK_RADIUS = 16;
  private static readonly ATTACK_DAMAGE = 1;
  private static readonly ATTACK_COOLDOWN = 1;
  public static readonly MAX_HEALTH = 3;

  private currentWaypoint: Vector2 | null = null;
  private attackCooldown: Cooldown;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.ZOMBIE);

    this.attackCooldown = new Cooldown(Zombie.ATTACK_COOLDOWN);

    this.extensions = [
      new Inventory(this, gameManagers.getBroadcaster()).addRandomItem(0.2),
      new Destructible(this)
        .setMaxHealth(Zombie.MAX_HEALTH)
        .setHealth(Zombie.MAX_HEALTH)
        .onDeath(this.onDeath.bind(this)),
      new Groupable(this, "enemy"),
      new Positionable(this).setSize(Zombie.Size),
      new Collidable(this).setSize(Zombie.Size.div(2)).setOffset(new Vector2(4, 4)),
      new Movable(this),
      new Updatable(this, this.updateZombie.bind(this)),
    ];
  }

  getCenterPosition(): Vector2 {
    const positionable = this.getExt(Positionable);
    const size = positionable.getSize();
    const position = positionable.getPosition();
    return new Rectangle(position, size).center;
  }

  getHitbox(): Rectangle {
    const collidable = this.getExt(Collidable);
    return collidable.getHitBox();
  }

  onDeath(): void {
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieDeathEvent(this.getId()));
    this.extensions.push(
      new Interactive(this).onInteract(this.afterDeathInteract.bind(this)).setDisplayName("loot")
    );
    this.getExt(Collidable).setEnabled(false);
  }

  afterDeathInteract(): void {
    const inventory = this.getExt(Inventory);
    if (inventory) {
      inventory.scatterItems(this.getPosition());
    }

    this.getEntityManager().markEntityForRemoval(this);
    this.getGameManagers().getBroadcaster().broadcastEvent(new LootEvent(this.getId()));
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

    this.setPosition(position);
    if (this.getEntityManager().isColliding(this, [Entities.ZOMBIE])) {
      position.x = previousX;
    }

    position.y += velocity.y * deltaTime;

    if (this.getEntityManager().isColliding(this, [Entities.ZOMBIE])) {
      position.y = previousY;
    }
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
        player.getExt(Positionable).getCenterPosition(),
        this.getGameManagers().getMapManager().getMap()
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

  private withinAttackRange(entity: IEntity): boolean {
    const centerPosition = entity.hasExt(Positionable)
      ? entity.getExt(Positionable).getCenterPosition()
      : (entity as any).getCenterPosition();

    const distance = Math.hypot(
      centerPosition.x - this.getCenterPosition().x,
      centerPosition.y - this.getCenterPosition().y
    );

    return distance <= Zombie.ATTACK_RADIUS;
  }

  private attemptAttackEntity(entity: IEntity) {
    if (!this.attackCooldown.isReady()) return;

    const withinRange = this.withinAttackRange(entity);
    if (!withinRange) return false;

    if (entity.hasExt(Destructible)) {
      entity.getExt(Destructible).damage(Zombie.ATTACK_DAMAGE);
      this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieAttackedEvent(this.getId()));
    }

    this.attackCooldown.reset();
    return true;
  }
}
