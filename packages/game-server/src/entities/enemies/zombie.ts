import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { getConfig } from "@shared/config";
import Vector2 from "@/util/vector2";
import { AttackStrategy, BaseEnemy, MovementStrategy } from "./base-enemy";
import { pathTowards, velocityTowards } from "@/util/physics";
import Positionable from "@/extensions/positionable";
import Movable from "@/extensions/movable";
import Destructible from "@/extensions/destructible";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { Cooldown } from "@/entities/util/cooldown";
import { IEntity } from "@/entities/types";

export class MeleeMovementStrategy implements MovementStrategy {
  private pathRecalculationTimer: number = 0;
  private static readonly PATH_RECALCULATION_INTERVAL = 1;
  private currentWaypoint: Vector2 | null = null;

  update(zombie: BaseEnemy, deltaTime: number): boolean {
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
      this.pathRecalculationTimer >= MeleeMovementStrategy.PATH_RECALCULATION_INTERVAL
    ) {
      const mapManager = zombie.getGameManagers().getMapManager();
      this.currentWaypoint = pathTowards(
        zombiePos,
        playerPos,
        mapManager.getGroundLayer(),
        mapManager.getCollidablesLayer()
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

export class MeleeAttackStrategy implements AttackStrategy {
  onEntityDamaged?: (entity: IEntity) => void;

  update(zombie: BaseEnemy, deltaTime: number): void {
    if (!zombie.getAttackCooldown().isReady()) return;

    // Get all nearby entities that can be attacked
    const nearbyEntities = zombie
      .getEntityManager()
      .getNearbyEntities(zombie.getCenterPosition(), getConfig().combat.ZOMBIE_ATTACK_RADIUS, [
        Entities.WALL,
        Entities.PLAYER,
        Entities.SENTRY_GUN,
      ]);

    // Find the closest entity to attack
    let closestEntity = null;
    let closestDistance = Infinity;

    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Destructible) || !entity.hasExt(Positionable)) continue;

      const distance = zombie
        .getCenterPosition()
        .distance(entity.getExt(Positionable).getCenterPosition());
      if (distance < closestDistance) {
        closestDistance = distance;
        closestEntity = entity;
      }
    }

    // Attack the closest entity
    if (closestEntity && closestEntity.hasExt(Destructible)) {
      closestEntity.getExt(Destructible).damage(zombie.getAttackDamage());

      // Call the damage hook if provided
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

export class Zombie extends BaseEnemy {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.ZOMBIE);

    this.setMovementStrategy(new MeleeMovementStrategy());
    this.setAttackStrategy(new MeleeAttackStrategy());
  }

  getAttackCooldown(): Cooldown {
    return this.attackCooldown;
  }

  getAttackDamage(): number {
    return this.attackDamage;
  }
}
