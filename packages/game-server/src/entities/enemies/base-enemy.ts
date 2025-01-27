import { IGameManagers } from "@/managers/types";
import { Wall } from "@/entities/items/wall";
import { Cooldown } from "@/entities/util/cooldown";
import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { Entities, Zombies } from "@shared/constants";
import { Entity } from "@/entities/entity";
import { pathTowards, velocityTowards } from "@/util/physics";
import { IEntity } from "@/entities/types";
import { LootEvent } from "@/events/server-sent/loot-event";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import { EntityType } from "@shared/types/entity";
import { Player } from "@/entities/player";

export abstract class BaseEnemy extends Entity {
  protected currentWaypoint: Vector2 | null = null;
  protected attackCooldown: Cooldown;
  protected pathRecalculationTimer: number = 0;
  protected static readonly POSITION_THRESHOLD = 1;
  protected static readonly PATH_RECALCULATION_INTERVAL = 1; // 1 second
  protected speed: number;
  protected entityType: EntityType;

  constructor(
    gameManagers: IGameManagers,
    entityType: EntityType,
    size: Vector2,
    maxHealth: number,
    attackCooldownTime: number,
    speed: number,
    dropChance: number = 0
  ) {
    super(gameManagers, entityType);

    this.speed = speed;
    this.entityType = entityType;
    this.attackCooldown = new Cooldown(attackCooldownTime);

    this.extensions = [
      new Inventory(this, gameManagers.getBroadcaster()).addRandomItem(dropChance),
      new Destructible(this)
        .setMaxHealth(maxHealth)
        .setHealth(maxHealth)
        .onDamaged(this.onDamaged.bind(this))
        .onDeath(this.onDeath.bind(this)),
      new Groupable(this, "enemy"),
      new Positionable(this).setSize(size),
      new Collidable(this).setSize(size.div(2)).setOffset(new Vector2(4, 4)),
      new Movable(this),
      new Updatable(this, this.updateEnemy.bind(this)),
    ];
  }

  abstract onDamaged(): void;

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
    this.extensions.push(
      new Interactive(this).onInteract(this.onLooted.bind(this)).setDisplayName("loot")
    );
    this.getExt(Collidable).setEnabled(false);
  }

  onLooted(): void {
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

  handleMovement(deltaTime: number) {
    const position = this.getPosition();
    const previousX = position.x;
    const previousY = position.y;

    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();

    position.x += velocity.x * deltaTime;

    this.setPosition(position);
    if (this.getEntityManager().isColliding(this)) {
      position.x = previousX;
    }

    position.y += velocity.y * deltaTime;

    if (this.getEntityManager().isColliding(this)) {
      position.y = previousY;
    }
  }

  protected isAtWaypoint(): boolean {
    if (!this.currentWaypoint) return true;

    const dx = Math.abs(this.getCenterPosition().x - this.currentWaypoint.x);
    const dy = Math.abs(this.getCenterPosition().y - this.currentWaypoint.y);

    return dx <= BaseEnemy.POSITION_THRESHOLD && dy <= BaseEnemy.POSITION_THRESHOLD;
  }

  protected attackNearbyPlayers() {
    const player = this.getEntityManager().getClosestAlivePlayer(this);
    if (!player) return;
    return this.attemptAttackEntity(player);
  }

  protected updateEnemy(deltaTime: number): void {
    this.attackCooldown.update(deltaTime);
    this.pathRecalculationTimer += deltaTime;

    const destructible = this.getExt(Destructible);
    if (destructible.isDead()) {
      return;
    }

    const player = this.getEntityManager().getClosestAlivePlayer(this);

    // Get new waypoint when we reach the current one, don't have one, or we're stuck
    if (
      (this.isAtWaypoint() ||
        this.pathRecalculationTimer >= BaseEnemy.PATH_RECALCULATION_INTERVAL) &&
      player
    ) {
      this.currentWaypoint = pathTowards(
        this.getCenterPosition(),
        player.getExt(Positionable).getCenterPosition(),
        this.getGameManagers().getMapManager().getMap()
      );
      this.pathRecalculationTimer = 0;
    }

    const movable = this.getExt(Movable);
    const velocity = movable.getVelocity();

    // Update velocity to move towards waypoint if we have one
    if (this.currentWaypoint) {
      const velocityVector = velocityTowards(this.getCenterPosition(), this.currentWaypoint);
      velocity.x = velocityVector.x * this.speed;
      velocity.y = velocityVector.y * this.speed;
    } else {
      velocity.x = 0;
      velocity.y = 0;
    }

    movable.setVelocity(velocity);

    this.handleMovement(deltaTime);
    this.handleAttack();
  }

  protected handleAttack() {
    if (!this.attackNearbyPlayers()) {
      this.attackNearbyWalls();
    }
  }

  protected attackNearbyWalls() {
    const nearbyWalls = this.getEntityManager().getNearbyEntities(
      this.getCenterPosition(),
      undefined,
      [Entities.WALL]
    ) as Wall[];

    if (nearbyWalls.length > 0) {
      const nearbyWall = nearbyWalls[0];
      this.attemptAttackEntity(nearbyWall);
    }
  }

  protected withinAttackRange(entity: IEntity, attackRadius: number): boolean {
    // Don't attack dead players
    if (entity instanceof Player && entity.isDead()) {
      return false;
    }

    const centerPosition = entity.hasExt(Positionable)
      ? entity.getExt(Positionable).getCenterPosition()
      : (entity as any).getCenterPosition();

    const distance = Math.hypot(
      centerPosition.x - this.getCenterPosition().x,
      centerPosition.y - this.getCenterPosition().y
    );

    return distance <= attackRadius;
  }

  protected abstract attemptAttackEntity(entity: IEntity): boolean;

  serialize(): any {
    const data = super.serialize();
    return {
      ...data,
      debugWaypoint: this.currentWaypoint,
    };
  }
}
