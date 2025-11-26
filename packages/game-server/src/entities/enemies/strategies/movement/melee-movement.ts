import { BaseEnemy, MovementStrategy } from "../../base-enemy";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import Movable from "@/extensions/movable";
import Snared from "@/extensions/snared";
import { pathTowards, velocityTowards } from "@/util/physics";
import { TargetChecker } from "../movement-utils";
import { calculateSeparationForce, blendSeparationForce } from "../separation";
import { getConfig } from "@shared/config";

export class MeleeMovementStrategy implements MovementStrategy {
  private static readonly PATH_RECALCULATION_INTERVAL = getConfig().entity.PATH_RECALCULATION_INTERVAL;
  private static readonly STUCK_DETECTION_TIME = getConfig().entity.STUCK_DETECTION_TIME;
  private static readonly WAYPOINT_REACHED_THRESHOLD = 8; // Increased threshold for reaching waypoint
  private pathRecalculationTimer: number =
    Math.random() * MeleeMovementStrategy.PATH_RECALCULATION_INTERVAL;
  private targetChecker = new TargetChecker();
  private currentWaypoint: Vector2 | null = null;
  private lastWaypointPosition: Vector2 | null = null; // Track position when waypoint was set
  private stuckTimer: number = 0; // Track time spent trying to reach current waypoint

  update(zombie: BaseEnemy, deltaTime: number): boolean {
    // If zombie is snared, don't move
    if (zombie.hasExt(Snared)) {
      const poolManager = PoolManager.getInstance();
      zombie.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
      return false;
    }

    this.pathRecalculationTimer += deltaTime;
    const zombiePos = zombie.getCenterPosition();

    // Update target using shared utility
    // Get fallback target from game mode strategy (car in waves mode, null in battle royale)
    const gameManagers = zombie.getGameManagers();
    const mapManager = gameManagers.getMapManager();
    const strategy = gameManagers.getGameServer().getGameLoop().getGameModeStrategy();
    const fallbackTarget = strategy.getZombieFallbackTarget(gameManagers);
    const currentTarget = this.targetChecker.updateTarget(zombie, deltaTime, fallbackTarget);

    // If no target, stop moving
    if (!currentTarget) {
      const poolManager = PoolManager.getInstance();
      zombie.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
      return false;
    }

    // Check if we've reached the current waypoint (with larger threshold)
    const distanceToWaypoint = this.currentWaypoint
      ? zombiePos.clone().sub(this.currentWaypoint).length()
      : Infinity;
    const reachedWaypoint = distanceToWaypoint <= MeleeMovementStrategy.WAYPOINT_REACHED_THRESHOLD;

    // Stuck detection: check if we're making progress towards the waypoint
    if (this.currentWaypoint && this.lastWaypointPosition) {
      const distanceToWaypointNow = distanceToWaypoint;
      const distanceToWaypointWhenSet = this.lastWaypointPosition
        .clone()
        .sub(this.currentWaypoint)
        .length();
      const progressMade = distanceToWaypointWhenSet - distanceToWaypointNow;

      // If we're not making progress (or moving away), increment stuck timer
      if (progressMade < 2) {
        // Less than 2 pixels of progress
        this.stuckTimer += deltaTime;
      } else {
        // Making progress, reset stuck timer
        this.stuckTimer = 0;
        this.lastWaypointPosition = zombiePos.clone();
      }
    } else {
      // No waypoint or last position, reset stuck timer
      this.stuckTimer = 0;
    }

    // If we don't have a waypoint, we've reached the current one, or we're stuck, get a new one
    const needNewWaypoint =
      !this.currentWaypoint ||
      reachedWaypoint ||
      this.stuckTimer >= MeleeMovementStrategy.STUCK_DETECTION_TIME;

    // Update path periodically or when we need a new waypoint
    if (
      needNewWaypoint ||
      this.pathRecalculationTimer >= MeleeMovementStrategy.PATH_RECALCULATION_INTERVAL
    ) {
      const waypoint = pathTowards(
        zombiePos.clone(),
        currentTarget.clone(),
        mapManager.getGroundLayer(),
        mapManager.getCollidablesLayer()
      );
      this.currentWaypoint = waypoint;
      this.pathRecalculationTimer = 0;
      this.stuckTimer = 0;
      this.lastWaypointPosition = zombiePos.clone(); // Track position when waypoint is set
    }

    // If we have a waypoint, move towards it
    if (this.currentWaypoint) {
      const pathfindingVelocity = velocityTowards(zombiePos.clone(), this.currentWaypoint.clone());
      const poolManager = PoolManager.getInstance();
      const pathfindingVelScaled = poolManager.vector2.claim(
        pathfindingVelocity.x * zombie.getSpeed(),
        pathfindingVelocity.y * zombie.getSpeed()
      );

      // Apply separation force to avoid clustering
      const separationForce = calculateSeparationForce(zombie);
      const finalVelocity = blendSeparationForce(pathfindingVelScaled, separationForce);

      zombie.getExt(Movable).setVelocity(finalVelocity);

      // Release pooled vectors (finalVelocity values are copied by Movable)
      poolManager.vector2.release(pathfindingVelScaled);
      poolManager.vector2.release(separationForce);
      poolManager.vector2.release(finalVelocity);
    } else {
      // If no waypoint found, stop moving
      const poolManager = PoolManager.getInstance();
      zombie.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
    }

    return false; // Let base enemy handle collision movement
  }
}
