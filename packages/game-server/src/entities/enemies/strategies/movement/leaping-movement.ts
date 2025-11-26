import { BaseEnemy, MovementStrategy } from "../../base-enemy";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import Movable from "@/extensions/movable";
import Snared from "@/extensions/snared";
import { pathTowards, velocityTowards } from "@/util/physics";
import { TargetChecker } from "../movement-utils";
import { calculateSeparationForce, blendSeparationForce } from "../separation";
import { getConfig } from "@shared/config";

// Shared state between movement and attack strategies
export class LeapingState {
  isLeaping: boolean = false;
}

export class LeapingMovementStrategy implements MovementStrategy {
  private static readonly PATH_RECALCULATION_INTERVAL = getConfig().entity.PATH_RECALCULATION_INTERVAL;
  private pathRecalculationTimer: number =
    Math.random() * LeapingMovementStrategy.PATH_RECALCULATION_INTERVAL;
  private targetChecker = new TargetChecker();
  private currentWaypoint: Vector2 | null = null;
  private leapingState: LeapingState;

  constructor(leapingState: LeapingState) {
    this.leapingState = leapingState;
  }

  update(zombie: BaseEnemy, deltaTime: number): boolean {
    // If zombie is snared, don't move
    if (zombie.hasExt(Snared)) {
      const poolManager = PoolManager.getInstance();
      zombie.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
      return false;
    }

    // Don't update movement if currently leaping - let the attack strategy control it
    if (this.leapingState.isLeaping) {
      return false; // Let base enemy handle movement with the leap velocity
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

    // If we don't have a waypoint or we've reached the current one, get a new one
    const needNewWaypoint =
      !this.currentWaypoint || zombiePos.clone().sub(this.currentWaypoint).length() <= 1;

    // Update path periodically or when we need a new waypoint
    if (
      needNewWaypoint ||
      this.pathRecalculationTimer >= LeapingMovementStrategy.PATH_RECALCULATION_INTERVAL
    ) {
      const waypoint = pathTowards(
        zombiePos.clone(),
        currentTarget.clone(),
        mapManager.getGroundLayer(),
        mapManager.getCollidablesLayer()
      );
      this.currentWaypoint = waypoint;
      this.pathRecalculationTimer = 0;
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
