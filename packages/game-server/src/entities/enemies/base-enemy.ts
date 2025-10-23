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
import { ZombieAttackedEvent } from "@/events/server-sent/zombie-attacked-event";
import { ZombieDeathEvent } from "@/events/server-sent/zombie-death-event";
import { ZombieHurtEvent } from "@/events/server-sent/zombie-hurt-event";
import { EntityCategory, EntityCategories, ZombieConfig, zombieRegistry } from "@shared/entities";

export interface MovementStrategy {
  // Return true if the strategy handled movement completely, false if it needs default movement handling
  update(zombie: BaseEnemy, deltaTime: number): boolean;
}

export interface AttackStrategy {
  update(zombie: BaseEnemy, deltaTime: number): void;
}

export abstract class BaseEnemy extends Entity {
  protected currentWaypoint: Vector2 | null = null;
  protected attackCooldown: Cooldown;
  protected pathRecalculationTimer: number = 0;
  protected static readonly POSITION_THRESHOLD = 1;
  protected static readonly PATH_RECALCULATION_INTERVAL = 1; // 1 second
  protected speed: number;
  protected entityType: EntityType;
  protected attackRadius: number;
  protected attackDamage: number;
  private movementStrategy?: MovementStrategy;
  private attackStrategy?: AttackStrategy;
  protected config: ZombieConfig;

  constructor(gameManagers: IGameManagers, entityType: EntityType, config?: ZombieConfig) {
    super(gameManagers, entityType);

    // Get config from registry if not provided
    this.config = config || zombieRegistry.get(entityType)!;
    if (!this.config) {
      throw new Error(`Zombie config not found for ${entityType}`);
    }

    this.speed = this.config.stats.speed;
    this.entityType = entityType;
    this.attackCooldown = new Cooldown(this.config.stats.attackCooldown);
    this.attackRadius = this.config.stats.attackRadius;
    this.attackDamage = this.config.stats.damage;
    this.extensions = [
      new Inventory(this, gameManagers.getBroadcaster()).addRandomItem(this.config.stats.dropChance),
      new Destructible(this)
        .setMaxHealth(this.config.stats.health)
        .setHealth(this.config.stats.health)
        .onDamaged(this.onDamaged.bind(this))
        .setOffset(new Vector2(4, 4))
        .onDeath(this.onDeath.bind(this)),
      new Groupable(this, "enemy"),
      new Positionable(this).setSize(this.config.stats.size),
      new Collidable(this).setSize(this.config.stats.size.div(2)).setOffset(new Vector2(4, 4)),
      new Movable(this),
      new Updatable(this, this.updateEnemy.bind(this)),
    ];
  }

  setMovementStrategy(strategy: MovementStrategy) {
    this.movementStrategy = strategy;
  }

  setAttackStrategy(strategy: AttackStrategy) {
    this.attackStrategy = strategy;
  }

  onDamaged(): void {
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieHurtEvent(this.getId()));
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
    this.extensions.push(
      new Interactive(this).onInteract(this.onLooted.bind(this)).setDisplayName("loot")
    );
    this.getExt(Collidable).setEnabled(false);
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieDeathEvent(this.getId()));
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

  protected updateEnemy(deltaTime: number): void {
    this.attackCooldown.update(deltaTime);
    this.pathRecalculationTimer += deltaTime;

    const destructible = this.getExt(Destructible);
    if (destructible.isDead()) {
      return;
    }

    // Update movement strategy first
    if (this.movementStrategy) {
      // Let the strategy decide if it wants to handle movement completely
      const handledMovement = this.movementStrategy.update(this, deltaTime);

      // If the strategy didn't handle movement completely, use default movement handling
      if (!handledMovement) {
        this.handleMovement(deltaTime);
      }
    }

    // Finally handle attacks
    if (this.attackStrategy) {
      this.attackStrategy.update(this, deltaTime);
    }
  }

  getAttackCooldown(): Cooldown {
    return this.attackCooldown;
  }

  getAttackDamage(): number {
    return this.attackDamage;
  }

  getSpeed(): number {
    return this.speed;
  }

  getCategory(): EntityCategory {
    return EntityCategories.ZOMBIE;
  }

  serialize(): any {
    const data = super.serialize();
    return {
      ...data,
      debugWaypoint: this.currentWaypoint,
    };
  }
}
