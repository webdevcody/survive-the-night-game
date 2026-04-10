import { IGameManagers } from "@/managers/types";
import { Cooldown } from "@/entities/util/cooldown";
import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Groupable from "@/extensions/groupable";
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
import { getConfig } from "@shared/config";
import { balanceConfig } from "@shared/config/balance-config";
import { Blood } from "@/entities/effects/blood";
import { distance, normalizeVector, pathTowards, velocityTowards } from "@/util/physics";
import { Player } from "@/entities/players/player";
import { gameEventBus } from "@/services/game-event-bus";
import Snared from "@/extensions/snared";
import { ZombieAlertedEvent } from "../../../../game-shared/src/events/server-sent/events/zombie-alerted-event";
import { calculateSeparationForce, blendSeparationForce } from "./strategies/separation";

export interface MovementStrategy {
  // Return true if the strategy handled movement completely, false if it needs default movement handling
  update(zombie: BaseEnemy, deltaTime: number): boolean;
}

export interface AttackStrategy {
  update(zombie: BaseEnemy, deltaTime: number): void;
}

import { SerializableFields } from "@/util/serializable-fields";

/** How spawn-leash handled movement this tick (flying patrol integrates position like FlyTowardsPlayerStrategy). */
type LeashMovementMode = "chasing" | "patrol_ground" | "patrol_air";

interface ResolvedLeashParams {
  wanderRadius: number;
  maxPlayerDistanceFromSpawn: number;
  activationRadius: number;
  wanderMoveDuration: number;
  wanderPauseDuration: number;
  wanderSpeed: number;
  wanderLookahead: number;
}

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
  private hasBeenLooted: boolean = false;

  /**
   * Spawn-anchored patrol + chase leash (all enemies).
   * Anchor is set on first live update from the zombie’s center (or via setSpawnAnchor after placement).
   * Patrol: wander inside wanderRadius; if outside, path home. Chase starts when a player is within
   * activationRadius of the zombie; ends when the closest player is farther than maxPlayerDistanceFromSpawn
   * from the anchor. See entityConfig ZOMBIE_LEASH_* and optional ZombieConfig.leash overrides.
   */
  private spawnAnchor: Vector2 | null = null;
  private isLeashChasing: boolean = false;
  private leashPlayerCheckTimer: number = Math.random() * getConfig().entity.PLAYER_CHECK_INTERVAL;
  private leashPathRecalcTimer: number =
    Math.random() * getConfig().entity.PATH_RECALCULATION_INTERVAL;
  private leashWaypoint: Vector2 | null = null;
  private leashWanderTimer: number = Math.random() * getConfig().entity.ZOMBIE_LEASH_WANDER_PAUSE_DURATION;
  private leashWanderDirection: Vector2 | null = null;
  private leashWanderMoving: boolean = false;

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
    // Apply global multiplier to reduce zombie item drop chance
    const adjustedDropChance =
      this.config.stats.dropChance * balanceConfig.ZOMBIE_ITEM_DROP_MULTIPLIER;
    this.addExtension(
      new Inventory(this, gameManagers.getBroadcaster()).addRandomItem(
        adjustedDropChance,
        this.config.dropTable
      )
    );
    this.addExtension(
      new Destructible(this)
        .setMaxHealth(this.config.stats.health)
        .setHealth(this.config.stats.health)
        .onDamaged(this.onDamaged.bind(this))
        .setOffset(PoolManager.getInstance().vector2.claim(0, 0))
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

  /** Override the auto-captured spawn anchor (e.g. debug spawns after setPosition). */
  setSpawnAnchor(position: Vector2): void {
    this.spawnAnchor = position.clone();
  }

  protected setCurrentWaypoint(waypoint: Vector2 | null) {
    this.currentWaypoint = waypoint;
    this.serialized.set("debugWaypoint", waypoint);
  }

  private ensureSpawnAnchor(): void {
    if (this.spawnAnchor !== null) {
      return;
    }
    this.spawnAnchor = this.getCenterPosition().clone();
  }

  private resolveLeashParams(): ResolvedLeashParams {
    const e = getConfig().entity;
    const o = this.config.leash;
    return {
      wanderRadius: o?.wanderRadius ?? e.ZOMBIE_LEASH_WANDER_RADIUS,
      maxPlayerDistanceFromSpawn: o?.maxPlayerDistanceFromSpawn ?? e.ZOMBIE_LEASH_MAX_PLAYER_DISTANCE_FROM_SPAWN,
      activationRadius: o?.activationRadius ?? e.IDLE_ACTIVATION_RADIUS,
      wanderMoveDuration: o?.wanderMoveDuration ?? e.ZOMBIE_LEASH_WANDER_MOVE_DURATION,
      wanderPauseDuration: o?.wanderPauseDuration ?? e.ZOMBIE_LEASH_WANDER_PAUSE_DURATION,
      wanderSpeed: o?.wanderSpeed ?? e.ZOMBIE_LEASH_WANDER_SPEED,
      wanderLookahead: o?.wanderLookahead ?? e.ZOMBIE_LEASH_WANDER_LOOKAHEAD,
    };
  }

  private isFlyingEnemy(): boolean {
    return (
      this.config.movementStrategy === "flying" || this.config.movementStrategy === "cross-dive"
    );
  }

  private resetLeashPatrolMotion(): void {
    this.leashWaypoint = null;
    this.leashPathRecalcTimer = 0;
    this.leashWanderMoving = false;
    this.leashWanderTimer = 0;
    this.leashWanderDirection = null;
  }

  private updateLeashChasingState(deltaTime: number, params: ResolvedLeashParams): void {
    this.leashPlayerCheckTimer += deltaTime;
    if (this.leashPlayerCheckTimer < getConfig().entity.PLAYER_CHECK_INTERVAL) {
      return;
    }
    this.leashPlayerCheckTimer = 0;
    if (!this.spawnAnchor) {
      return;
    }

    const prev = this.isLeashChasing;
    const player = this.getEntityManager().getClosestAlivePlayer(this);

    if (!player || !player.hasExt(Positionable)) {
      this.isLeashChasing = false;
    } else {
      const playerPos = player.getExt(Positionable).getCenterPosition();
      const zombiePos = this.getCenterPosition();
      const distToPlayer = distance(zombiePos, playerPos);
      const dPlayerToAnchor = distance(playerPos, this.spawnAnchor);
      if (this.isLeashChasing) {
        if (dPlayerToAnchor > params.maxPlayerDistanceFromSpawn) {
          this.isLeashChasing = false;
        }
      } else if (distToPlayer <= params.activationRadius) {
        this.isLeashChasing = true;
      }
    }

    if (!prev && this.isLeashChasing) {
      this.resetLeashPatrolMotion();
      const zPos = this.getCenterPosition();
      this.getGameManagers()
        .getBroadcaster()
        .broadcastEvent(new ZombieAlertedEvent(this.getId(), { x: zPos.x, y: zPos.y }));
    }

    if (prev && !this.isLeashChasing) {
      this.leashWaypoint = null;
      this.leashPathRecalcTimer = 0;
    }
  }

  /**
   * Patrol target for pathfinding / direct flight: spawn when outside wander disc, random wander
   * lookahead when inside, or null when paused between wander legs.
   */
  private computeLeashPatrolTarget(
    deltaTime: number,
    zombiePos: Vector2,
    anchor: Vector2,
    params: ResolvedLeashParams,
  ): Vector2 | null {
    const distFromAnchor = distance(zombiePos, anchor);
    if (distFromAnchor > params.wanderRadius) {
      return anchor.clone();
    }

    this.leashWanderTimer += deltaTime;

    if (this.leashWanderMoving) {
      if (this.leashWanderTimer >= params.wanderMoveDuration) {
        this.leashWanderMoving = false;
        this.leashWanderTimer = 0;
        this.leashWanderDirection = null;
        return null;
      }
      if (!this.leashWanderDirection) {
        return null;
      }
      const poolManager = PoolManager.getInstance();
      const lookahead = params.wanderLookahead;
      const t = poolManager.vector2.claim(
        zombiePos.x + this.leashWanderDirection.x * lookahead,
        zombiePos.y + this.leashWanderDirection.y * lookahead,
      );
      const d = distance(t, anchor);
      if (d > params.wanderRadius) {
        const scale = params.wanderRadius / d;
        t.x = anchor.x + (t.x - anchor.x) * scale;
        t.y = anchor.y + (t.y - anchor.y) * scale;
      }
      const out = t.clone();
      poolManager.vector2.release(t);
      return out;
    }

    if (this.leashWanderTimer >= params.wanderPauseDuration) {
      this.leashWanderMoving = true;
      this.leashWanderTimer = 0;
      const angle = Math.random() * Math.PI * 2;
      const poolManager = PoolManager.getInstance();
      const raw = poolManager.vector2.claim(Math.cos(angle), Math.sin(angle));
      this.leashWanderDirection = normalizeVector(raw);
      poolManager.vector2.release(raw);
    }
    return null;
  }

  private applySpawnLeashBehavior(deltaTime: number): LeashMovementMode {
    this.ensureSpawnAnchor();
    const params = this.resolveLeashParams();
    const zombiePos = this.getCenterPosition();
    const anchor = this.spawnAnchor!;

    this.updateLeashChasingState(deltaTime, params);

    if (this.hasExt(Snared)) {
      const poolManager = PoolManager.getInstance();
      this.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
      return "patrol_ground";
    }

    if (this.isLeashChasing) {
      return "chasing";
    }

    const patrolTarget = this.computeLeashPatrolTarget(deltaTime, zombiePos, anchor, params);
    const mapManager = this.getGameManagers().getMapManager();

    if (this.isFlyingEnemy()) {
      const movable = this.getExt(Movable);
      const poolManager = PoolManager.getInstance();
      if (!patrolTarget) {
        movable.setVelocity(poolManager.vector2.claim(0, 0));
        return "patrol_air";
      }
      const pathfindingVelocity = velocityTowards(zombiePos.clone(), patrolTarget.clone());
      const pathfindingVelScaled = poolManager.vector2.claim(
        pathfindingVelocity.x * params.wanderSpeed,
        pathfindingVelocity.y * params.wanderSpeed,
      );
      const separationForce = calculateSeparationForce(this);
      const finalVelocity = blendSeparationForce(pathfindingVelScaled, separationForce);
      movable.setVelocity(finalVelocity);
      poolManager.vector2.release(pathfindingVelScaled);
      poolManager.vector2.release(separationForce);
      poolManager.vector2.release(finalVelocity);

      const position = this.getPosition();
      position.x += movable.getVelocity().x * deltaTime;
      position.y += movable.getVelocity().y * deltaTime;
      this.setPosition(position);
      return "patrol_air";
    }

    if (!patrolTarget) {
      const poolManager = PoolManager.getInstance();
      this.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
      this.leashWaypoint = null;
      return "patrol_ground";
    }

    this.leashPathRecalcTimer += deltaTime;
    const waypointThreshold = getConfig().entity.WAYPOINT_REACHED_THRESHOLD;
    const distWaypoint = this.leashWaypoint
      ? zombiePos.clone().sub(this.leashWaypoint).length()
      : Infinity;
    const needNewWaypoint =
      !this.leashWaypoint ||
      distWaypoint <= waypointThreshold ||
      this.leashPathRecalcTimer >= getConfig().entity.PATH_RECALCULATION_INTERVAL;

    if (needNewWaypoint) {
      this.leashWaypoint = pathTowards(
        zombiePos.clone(),
        patrolTarget.clone(),
        mapManager.getGroundLayer(),
        mapManager.getCollidablesLayer(),
      );
      this.leashPathRecalcTimer = 0;
    }

    if (this.leashWaypoint) {
      const pathfindingVelocity = velocityTowards(zombiePos.clone(), this.leashWaypoint.clone());
      const poolManager = PoolManager.getInstance();
      const pathfindingVelScaled = poolManager.vector2.claim(
        pathfindingVelocity.x * params.wanderSpeed,
        pathfindingVelocity.y * params.wanderSpeed,
      );
      const separationForce = calculateSeparationForce(this);
      const finalVelocity = blendSeparationForce(pathfindingVelScaled, separationForce);
      this.getExt(Movable).setVelocity(finalVelocity);
      poolManager.vector2.release(pathfindingVelScaled);
      poolManager.vector2.release(separationForce);
      poolManager.vector2.release(finalVelocity);
    } else {
      const poolManager = PoolManager.getInstance();
      this.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
    }

    return "patrol_ground";
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
    this.getExt(Collidable).setEnabled(false);
    this.getGameManagers()
      .getBroadcaster()
      .broadcastEvent(new ZombieDeathEvent(this.getId(), killerId || 0));

    // Emit internal event for kill tracking (decoupled from HTTP/API logic)
    if (killerId) {
      gameEventBus.emitZombieKilled({
        zombieEntityId: this.getId(),
        killerEntityId: killerId,
        timestamp: Date.now(),
      });
    }

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
    // Prevent multiple loots
    if (this.hasBeenLooted) {
      return;
    }
    this.hasBeenLooted = true;

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
      // Check for auto-looting when dead (only if not already looted)
      if (!this.hasBeenLooted) {
        const zombiePos = this.getCenterPosition();
        const interactRadius = getConfig().player.MAX_INTERACT_RADIUS;

        // Check for nearby alive players
        const nearbyPlayers = this.getEntityManager()
          .getNearbyEntities(zombiePos, interactRadius, new Set([Entities.PLAYER]))
          .filter((entity) => entity instanceof Player && !entity.isDead());

        // If any player is within interaction range, auto-loot
        if (nearbyPlayers.length > 0) {
          for (const player of nearbyPlayers) {
            if (player instanceof Player && player.hasExt(Positionable)) {
              const playerPos = player.getExt(Positionable).getCenterPosition();
              const dist = distance(zombiePos, playerPos);
              if (dist <= interactRadius) {
                this.onLooted();
                return;
              }
            }
          }
        }
      }
      return;
    }

    // Spawn leash + patrol, or delegate to movement strategy when chasing
    const endMovementStrategy =
      tickPerformanceTracker?.startMethod("movementStrategy", "updateEnemy") || (() => {});
    let handledMovement = false;
    const leashMode = this.applySpawnLeashBehavior(deltaTime);
    if (leashMode === "chasing") {
      if (this.movementStrategy) {
        handledMovement = this.movementStrategy.update(this, deltaTime);
      }
      if (!handledMovement) {
        this.handleMovement(deltaTime);
      }
    } else if (leashMode === "patrol_ground") {
      this.handleMovement(deltaTime);
    }
    endMovementStrategy();

    const endHandleMovement =
      tickPerformanceTracker?.startMethod("handleMovement", "updateEnemy") || (() => {});
    endHandleMovement();

    const endAttackStrategy =
      tickPerformanceTracker?.startMethod("attackStrategy", "updateEnemy") || (() => {});
    if (this.attackStrategy) {
      let shouldRunAttack = this.isLeashChasing;
      if (!shouldRunAttack) {
        const quickPlayerCheck =
          tickPerformanceTracker?.startMethod("quickPlayerCheck", "attackStrategy") || (() => {});
        const player = this.getEntityManager().getClosestAlivePlayer(this);
        quickPlayerCheck();
        if (player && player.hasExt(Positionable)) {
          const playerPos = player.getExt(Positionable).getCenterPosition();
          const zombiePos = this.getCenterPosition();
          const distanceToPlayer = distance(zombiePos, playerPos);
          const maxAttackRange = getConfig().combat.ZOMBIE_ATTACK_RADIUS + 100;
          shouldRunAttack = distanceToPlayer <= maxAttackRange;
        }
      }
      if (shouldRunAttack) {
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
