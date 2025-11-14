import { BaseEnemy, MovementStrategy } from "../../base-enemy";
import Vector2 from "@/util/vector2";
import Movable from "@/extensions/movable";
import Snared from "@/extensions/snared";
import { pathTowards, velocityTowards } from "@/util/physics";
import { TargetingSystem } from "../targeting";

export class MeleeMovementStrategy implements MovementStrategy {
  private static readonly PATH_RECALCULATION_INTERVAL = 1;
  private pathRecalculationTimer: number = Math.random() * MeleeMovementStrategy.PATH_RECALCULATION_INTERVAL;
  private currentWaypoint: Vector2 | null = null;

  update(zombie: BaseEnemy, deltaTime: number): boolean {
    // If zombie is snared, don't move
    if (zombie.hasExt(Snared)) {
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
      return false;
    }

    this.pathRecalculationTimer += deltaTime;
    const zombiePos = zombie.getCenterPosition();

    // Find the closest friendly entity (car, player, or survivor)
    const closestFriendly = TargetingSystem.findClosestFriendlyEntity(zombie, 500);
    const targetPos = closestFriendly?.position || null;

    if (!targetPos) return false;

    // If we don't have a waypoint or we've reached the current one, get a new one
    const needNewWaypoint = !this.currentWaypoint || zombiePos.distance(this.currentWaypoint) <= 1;

    // Update path periodically or when we need a new waypoint
    if (
      needNewWaypoint ||
      this.pathRecalculationTimer >= MeleeMovementStrategy.PATH_RECALCULATION_INTERVAL
    ) {
      const mapManager = zombie.getGameManagers().getMapManager();
      const waypoint = pathTowards(
        zombiePos,
        targetPos,
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
      // If no waypoint found, stop moving
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
    }

    return false; // Let base enemy handle collision movement
  }
}

