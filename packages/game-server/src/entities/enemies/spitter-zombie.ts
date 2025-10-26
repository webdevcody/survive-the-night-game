import { IGameManagers } from "@/managers/types";
import { ZombieAttackedEvent } from "@shared/events/server-sent/zombie-attacked-event";
import { Entities } from "@/constants";
import Vector2 from "@/util/vector2";
import { AttackStrategy, BaseEnemy, MovementStrategy } from "./base-enemy";
import { AcidProjectile } from "../projectiles/acid-projectile";
import Positionable from "@/extensions/positionable";
import Movable from "@/extensions/movable";
import { pathTowards, velocityTowards } from "@/util/physics";
import { Cooldown } from "@/entities/util/cooldown";

class RangedMovementStrategy implements MovementStrategy {
  private static readonly ATTACK_RANGE = 100;
  private pathRecalculationTimer: number = 0;
  private static readonly PATH_RECALCULATION_INTERVAL = 1;
  private currentWaypoint: Vector2 | null = null;

  update(zombie: BaseEnemy, deltaTime: number): boolean {
    this.pathRecalculationTimer += deltaTime;
    const player = zombie.getEntityManager().getClosestAlivePlayer(zombie);
    if (!player) return false;

    const playerPos = player.getExt(Positionable).getCenterPosition();
    const zombiePos = zombie.getCenterPosition();
    const distanceToPlayer = zombiePos.distance(playerPos);

    // If within attack range, stop moving
    if (distanceToPlayer <= RangedMovementStrategy.ATTACK_RANGE) {
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
      return false;
    }

    // If we don't have a waypoint or we've reached the current one, get a new one
    const needNewWaypoint = !this.currentWaypoint || zombiePos.distance(this.currentWaypoint) <= 1;

    // Update path periodically or when we need a new waypoint
    if (
      needNewWaypoint ||
      this.pathRecalculationTimer >= RangedMovementStrategy.PATH_RECALCULATION_INTERVAL
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
      // If no waypoint found, try moving directly towards player
      const velocity = velocityTowards(zombiePos, playerPos);
      zombie.getExt(Movable).setVelocity(velocity.mul(zombie.getSpeed() * 0.5)); // Move slower when no path found
    }

    return false; // Let base enemy handle collision movement
  }
}

class RangedAttackStrategy implements AttackStrategy {
  private static readonly ATTACK_RANGE = 100;

  update(zombie: BaseEnemy, deltaTime: number): void {
    if (!(zombie instanceof SpitterZombie)) return;
    if (!zombie.getAttackCooldown().isReady()) return;

    const player = zombie.getEntityManager().getClosestAlivePlayer(zombie);
    if (!player) return;

    const playerPos = player.getExt(Positionable).getCenterPosition();
    const zombiePos = zombie.getCenterPosition();
    const distanceToPlayer = zombiePos.distance(playerPos);

    if (distanceToPlayer <= RangedAttackStrategy.ATTACK_RANGE) {
      // Spawn acid projectile that travels towards the target
      const projectile = new AcidProjectile(zombie.getGameManagers(), zombiePos, playerPos);
      zombie.getEntityManager().addEntity(projectile);

      zombie
        .getGameManagers()
        .getBroadcaster()
        .broadcastEvent(new ZombieAttackedEvent(zombie.getId()));
      zombie.getAttackCooldown().reset();
    }
  }
}

export class SpitterZombie extends BaseEnemy {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.SPITTER_ZOMBIE);

    this.setMovementStrategy(new RangedMovementStrategy());
    this.setAttackStrategy(new RangedAttackStrategy());
  }

  getAttackCooldown(): Cooldown {
    return this.attackCooldown;
  }
}
