import { BaseEnemy, MovementStrategy } from "../../base-enemy";
import Vector2 from "@/util/vector2";
import Movable from "@/extensions/movable";
import Snared from "@/extensions/snared";
import { pathTowards, velocityTowards } from "@/util/physics";
import { TargetingSystem } from "../targeting";

export class RangedMovementStrategy implements MovementStrategy {
  private static readonly ATTACK_RANGE = 100;
  private static readonly PATH_RECALCULATION_INTERVAL = 1;
  private pathRecalculationTimer: number = Math.random() * RangedMovementStrategy.PATH_RECALCULATION_INTERVAL;
  private currentWaypoint: Vector2 | null = null;

  update(zombie: BaseEnemy, deltaTime: number): boolean {
    // If zombie is snared, don't move
    if (zombie.hasExt(Snared)) {
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
      return false;
    }

    this.pathRecalculationTimer += deltaTime;
    const playerTarget = TargetingSystem.findClosestPlayer(zombie);
    if (!playerTarget) return false;

    const playerPos = playerTarget.position;
    const zombiePos = zombie.getCenterPosition();
    const distanceToPlayer = playerTarget.distance;

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
      const waypoint = pathTowards(
        zombiePos,
        playerPos,
        mapManager.getGroundLayer(),
        mapManager.getCollidablesLayer()
      );
      this.currentWaypoint = waypoint;
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

