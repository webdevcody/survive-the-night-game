import { IGameManagers } from "@/managers/types";
import { Entities, ZOMBIE_ATTACK_RADIUS } from "@shared/constants";
import Vector2 from "@shared/util/vector2";
import { BaseEnemy, AttackStrategy, MovementStrategy } from "./base-enemy";
import Collidable from "@/extensions/collidable";
import { Cooldown } from "@/entities/util/cooldown";
import Positionable from "@/extensions/positionable";
import Movable from "@/extensions/movable";
import Destructible from "@/extensions/destructible";
import { pathTowards, velocityTowards } from "@/util/physics";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { IEntity } from "@/entities/types";
import { LeapConfig } from "@shared/entities";

// Shared state between movement and attack strategies
class LeapingState {
  isLeaping: boolean = false;
}

export class LeapingMovementStrategy implements MovementStrategy {
  private pathRecalculationTimer: number = 0;
  private static readonly PATH_RECALCULATION_INTERVAL = 1;
  private currentWaypoint: Vector2 | null = null;
  private leapingState: LeapingState;

  constructor(leapingState: LeapingState) {
    this.leapingState = leapingState;
  }

  update(zombie: BaseEnemy, deltaTime: number): boolean {
    // Don't update movement if currently leaping - let the attack strategy control it
    if (this.leapingState.isLeaping) {
      return false; // Let base enemy handle movement with the leap velocity
    }

    this.pathRecalculationTimer += deltaTime;
    const player = zombie.getEntityManager().getClosestAlivePlayer(zombie);
    if (!player) return false;

    const playerPos = player.getExt(Positionable).getCenterPosition();
    const zombiePos = zombie.getCenterPosition();

    // If we don't have a waypoint or we've reached the current one, get a new one
    const needNewWaypoint = !this.currentWaypoint || zombiePos.distance(this.currentWaypoint) <= 1;

    // Update path periodically or when we need a new waypoint
    if (
      needNewWaypoint ||
      this.pathRecalculationTimer >= LeapingMovementStrategy.PATH_RECALCULATION_INTERVAL
    ) {
      this.currentWaypoint = pathTowards(
        zombiePos,
        playerPos,
        zombie.getGameManagers().getMapManager().getMap()
      );
      this.pathRecalculationTimer = 0;
    }

    // If we have a waypoint, move towards it
    if (this.currentWaypoint) {
      const velocity = velocityTowards(zombiePos, this.currentWaypoint);
      zombie.getExt(Movable).setVelocity(velocity.mul(zombie.getSpeed()));
    } else {
      // If no waypoint found, stop moving
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
    }

    return false; // Let base enemy handle collision movement
  }
}

export class LeapingAttackStrategy implements AttackStrategy {
  private leapCooldown: Cooldown;
  private leapDuration: number = 0;
  private leapingState: LeapingState;
  private leapConfig: LeapConfig;

  onEntityDamaged?: (entity: IEntity) => void;

  constructor(leapingState: LeapingState, leapConfig: LeapConfig) {
    this.leapingState = leapingState;
    this.leapConfig = leapConfig;
    this.leapCooldown = new Cooldown(leapConfig.leapCooldown);
  }

  update(zombie: BaseEnemy, deltaTime: number): void {
    this.leapCooldown.update(deltaTime);

    const player = zombie.getEntityManager().getClosestAlivePlayer(zombie);
    if (!player) return;

    const playerPos = player.getExt(Positionable).getCenterPosition();
    const zombiePos = zombie.getCenterPosition();
    const distanceToPlayer = zombiePos.distance(playerPos);

    // Handle leap duration countdown
    if (this.leapingState.isLeaping) {
      this.leapDuration += deltaTime;
      if (this.leapDuration >= this.leapConfig.leapDuration) {
        this.leapingState.isLeaping = false;
        this.leapDuration = 0;
      }
    }

    // Check if we should initiate a leap (player in sweet spot range)
    if (
      !this.leapingState.isLeaping &&
      this.leapCooldown.isReady() &&
      distanceToPlayer > ZOMBIE_ATTACK_RADIUS && // Not too close
      distanceToPlayer <= this.leapConfig.leapRange // Not too far
    ) {
      // Initiate leap - apply velocity boost
      const leapVelocity = velocityTowards(zombiePos, playerPos).mul(this.leapConfig.leapSpeed);
      zombie.getExt(Movable).setVelocity(leapVelocity);
      this.leapingState.isLeaping = true;
      this.leapDuration = 0;
      this.leapCooldown.reset();
    }

    // Normal melee attack - always attack if close enough and cooldown ready
    if (zombie.getAttackCooldown().isReady()) {
      const nearbyEntities = zombie
        .getEntityManager()
        .getNearbyEntities(zombiePos, ZOMBIE_ATTACK_RADIUS, [Entities.WALL, Entities.PLAYER]);

      // Find the closest entity to attack
      let closestEntity = null;
      let closestDistance = Infinity;

      for (const entity of nearbyEntities) {
        if (!entity.hasExt(Destructible) || !entity.hasExt(Positionable)) continue;

        const distance = zombiePos.distance(entity.getExt(Positionable).getCenterPosition());
        if (distance < closestDistance) {
          closestDistance = distance;
          closestEntity = entity;
        }
      }

      // Attack the closest entity
      if (closestEntity && closestEntity.hasExt(Destructible)) {
        closestEntity.getExt(Destructible).damage(zombie.getAttackDamage());

        if (this.onEntityDamaged) {
          this.onEntityDamaged(closestEntity);
        }

        zombie
          .getGameManagers()
          .getBroadcaster()
          .broadcastEvent(new ZombieAttackedEvent(zombie.getId()));
        zombie.getAttackCooldown().reset();
      }
    }
  }
}

export class LeapingZombie extends BaseEnemy {
  private readonly positionThreshold = 4; // Larger threshold for faster speed

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.LEAPING_ZOMBIE);

    if (!this.config.leapConfig) {
      throw new Error("LeapingZombie requires leapConfig in zombie config");
    }

    const collidable = this.getExt(Collidable);
    collidable
      .setSize(this.config.stats.size)
      .setOffset(new Vector2(this.positionThreshold, this.positionThreshold));

    // Create shared state between movement and attack strategies
    const leapingState = new LeapingState();

    this.setMovementStrategy(new LeapingMovementStrategy(leapingState));
    this.setAttackStrategy(new LeapingAttackStrategy(leapingState, this.config.leapConfig));
  }

  getAttackCooldown(): Cooldown {
    return this.attackCooldown;
  }

  getAttackDamage(): number {
    return this.attackDamage;
  }
}
