import { IGameManagers } from "@/managers/types";
import { Cooldown } from "@/entities/util/cooldown";
import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";
import Interactive from "@/extensions/interactive";
import Inventory from "@/extensions/inventory";
import Movable from "@/extensions/movable";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { Entities } from "@shared/constants";
import { Entity } from "@/entities/entity";
import { LootEvent } from "../../../../game-shared/src/events/server-sent/events/loot-event";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { EntityType } from "@shared/types/entity";
import { ZombieDeathEvent } from "../../../../game-shared/src/events/server-sent/events/zombie-death-event";
import { ZombieHurtEvent } from "../../../../game-shared/src/events/server-sent/events/zombie-hurt-event";
import { EntityCategory, EntityCategories, ZombieConfig, zombieRegistry } from "@shared/entities";
import { IdleMovementStrategy } from "./strategies/movement/idle-movement";
import { getConfig } from "@shared/config";
import { Blood } from "@/entities/effects/blood";

export interface MovementStrategy {
  // Return true if the strategy handled movement completely, false if it needs default movement handling
  update(zombie: BaseEnemy, deltaTime: number): boolean;
}

export interface AttackStrategy {
  update(zombie: BaseEnemy, deltaTime: number): void;
}

import { SerializableFields } from "@/util/serializable-fields";

export abstract class BaseEnemy extends Entity {
  // Internal state (not serialized)
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

    // Initialize serializable fields
    this.serialized = new SerializableFields({ debugWaypoint: null }, () => this.markEntityDirty());

    // Get config from registry if not provided
    this.config = config || zombieRegistry.get(entityType)!;
    if (!this.config) {
      throw new Error(`Zombie config not found for ${entityType}`);
    }

    this.speed = this.config.stats.speed;
    this.entityType = entityType;
    this.attackCooldown = new Cooldown(this.config.stats.attackCooldown);
    // Offset attack cooldown randomly to prevent all zombies from attacking simultaneously
    // This spreads out expensive entity queries across time
    const randomOffset = Math.random() * this.config.stats.attackCooldown;
    this.attackCooldown.setTimeRemaining(randomOffset);
    this.attackRadius = this.config.stats.attackRadius;
    this.attackDamage = this.config.stats.damage;
    this.addExtension(
      new Inventory(this, gameManagers.getBroadcaster()).addRandomItem(this.config.stats.dropChance)
    );
    this.addExtension(
      new Destructible(this)
        .setMaxHealth(this.config.stats.health)
        .setHealth(this.config.stats.health)
        .onDamaged(this.onDamaged.bind(this))
        .setOffset(PoolManager.getInstance().vector2.claim(4, 4))
        .onDeath(this.onDeath.bind(this))
    );
    this.addExtension(new Groupable(this, "enemy"));
    this.addExtension(new Positionable(this).setSize(this.config.stats.size));
    this.addExtension(
      new Collidable(this)
        .setSize(this.config.stats.size.clone().div(2))
        .setOffset(PoolManager.getInstance().vector2.claim(4, 4))
    );
    this.addExtension(new Movable(this));
    this.addExtension(new Updatable(this, this.updateEnemy.bind(this)));
  }

  setMovementStrategy(strategy: MovementStrategy) {
    this.movementStrategy = strategy;
  }

  setAttackStrategy(strategy: AttackStrategy) {
    this.attackStrategy = strategy;
  }

  protected setCurrentWaypoint(waypoint: Vector2 | null) {
    this.currentWaypoint = waypoint;
    this.serialized.set('debugWaypoint', waypoint);
  }

  onDamaged(): void {
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieHurtEvent(this.getId()));

    // Create blood entity at zombie position
    const position = this.getExt(Positionable).getPosition();
    const blood = new Blood(this.getGameManagers());
    blood.getExt(Positionable).setPosition(position);
    this.getEntityManager().addEntity(blood);
  }

  getCenterPosition(): Vector2 {
    const poolManager = PoolManager.getInstance();
    const positionable = this.getExt(Positionable);
    const size = positionable.getSize();
    const position = positionable.getPosition();
    const rect = poolManager.rectangle.claim(position, size);
    const center = rect.center;
    poolManager.rectangle.release(rect);
    return center;
  }

  getHitbox(): Rectangle {
    const collidable = this.getExt(Collidable);
    return collidable.getHitBox();
  }

  onDeath(killerId?: number): void {
    this.addExtension(
      new Interactive(this).onInteract(this.onLooted.bind(this)).setDisplayName("loot")
    );
    this.getExt(Collidable).setEnabled(false);
    this.getGameManagers().getBroadcaster().broadcastEvent(new ZombieDeathEvent(this.getId(), killerId || 0));

    // Spawn a coin when zombie dies
    this.spawnCoin();

    // Mark entity for removal if not looted
    this.getEntityManager().markEntityForRemoval(this, getConfig().entity.ENTITY_DESPAWN_TIME_MS);
  }

  spawnCoin(): void {
    const coin = this.getEntityManager().createEntity(Entities.COIN);
    if (coin && coin.hasExt(Positionable)) {
      coin.getExt(Positionable).setPosition(this.getPosition());
      this.getEntityManager().addEntity(coin);
    }
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
      this.setPosition(position);
    }

    position.y += velocity.y * deltaTime;
    this.setPosition(position);

    if (this.getEntityManager().isColliding(this)) {
      position.y = previousY;
      this.setPosition(position);
    }
  }

  protected isAtWaypoint(): boolean {
    if (!this.currentWaypoint) return true;

    const dx = Math.abs(this.getCenterPosition().x - this.currentWaypoint.x);
    const dy = Math.abs(this.getCenterPosition().y - this.currentWaypoint.y);

    return dx <= BaseEnemy.POSITION_THRESHOLD && dy <= BaseEnemy.POSITION_THRESHOLD;
  }

  protected updateEnemy(deltaTime: number): void {
    // Get performance tracker for detailed analytics
    const entityManager = this.getEntityManager() as any;
    const tickPerformanceTracker = entityManager.tickPerformanceTracker;

    // Track cooldown updates
    const endCooldownUpdates =
      tickPerformanceTracker?.startMethod("cooldownUpdates", "updateEnemy") || (() => {});
    this.attackCooldown.update(deltaTime);
    this.pathRecalculationTimer += deltaTime;
    endCooldownUpdates();

    const destructible = this.getExt(Destructible);
    if (destructible.isDead()) {
      return;
    }

    // Track movement strategy update
    const endMovementStrategy =
      tickPerformanceTracker?.startMethod("movementStrategy", "updateEnemy") || (() => {});
    let handledMovement = false;
    if (this.movementStrategy) {
      // Let the strategy decide if it wants to handle movement completely
      handledMovement = this.movementStrategy.update(this, deltaTime);
    }
    endMovementStrategy();

    // Track default movement handling (if needed)
    const endHandleMovement =
      tickPerformanceTracker?.startMethod("handleMovement", "updateEnemy") || (() => {});
    if (!handledMovement) {
      this.handleMovement(deltaTime);
    }
    endHandleMovement();

    // Track attack strategy update
    // For idle zombies, only run attack strategy if there's a nearby player (quick check first)
    // This avoids expensive entity queries when zombies are idle and far from players
    const endAttackStrategy =
      tickPerformanceTracker?.startMethod("attackStrategy", "updateEnemy") || (() => {});
    if (this.attackStrategy) {
      // Quick check: if this is an idle zombie, only attack if player is nearby
      // This prevents expensive queries when zombies are idle and far away
      const isIdleZombie = this.movementStrategy instanceof IdleMovementStrategy;
      if (isIdleZombie) {
        // Quick player check before expensive attack queries
        const quickPlayerCheck =
          tickPerformanceTracker?.startMethod("quickPlayerCheck", "attackStrategy") || (() => {});
        const player = this.getEntityManager().getClosestAlivePlayer(this);
        quickPlayerCheck();

        // Only run attack strategy if player is nearby (within reasonable attack range)
        if (player && player.hasExt(Positionable)) {
          const playerPos = player.getExt(Positionable).getCenterPosition();
          const zombiePos = this.getCenterPosition();
          const distanceToPlayer = zombiePos.distance(playerPos);
          const maxAttackRange = getConfig().combat.ZOMBIE_ATTACK_RADIUS + 100; // Add buffer

          if (distanceToPlayer <= maxAttackRange) {
            this.attackStrategy.update(this, deltaTime);
          }
        }
      } else {
        // Non-idle zombies always run attack strategy
        this.attackStrategy.update(this, deltaTime);
      }
    }
    endAttackStrategy();
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
}
