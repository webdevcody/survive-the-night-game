import { BaseEnemy, MovementStrategy } from "../../base-enemy";
import Vector2 from "@/util/vector2";
import Movable from "@/extensions/movable";
import Snared from "@/extensions/snared";
import { pathTowards, velocityTowards } from "@/util/physics";
import { TargetingSystem } from "../targeting";

export class IdleMovementStrategy implements MovementStrategy {
  private static readonly PATH_RECALCULATION_INTERVAL = 1;
  private pathRecalculationTimer: number =
    Math.random() * IdleMovementStrategy.PATH_RECALCULATION_INTERVAL;
  private static readonly ACTIVATION_RADIUS = 100; // Pixels
  private static readonly PLAYER_CHECK_INTERVAL = 0.5; // Check for players every 0.5 seconds instead of every tick
  private currentWaypoint: Vector2 | null = null;
  private isActivated: boolean = false;
  private playerCheckTimer: number = Math.random() * IdleMovementStrategy.PLAYER_CHECK_INTERVAL; // Offset to spread checks

  update(zombie: BaseEnemy, deltaTime: number): boolean {
    return;
    // If zombie is snared, don't move
    if (zombie.hasExt(Snared)) {
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
      return false;
    }

    const zombiePos = zombie.getCenterPosition();
    let targetPos: Vector2 | null = null;

    // Only check for players periodically (not every tick) to reduce CPU usage
    // This is especially important when there are many idle zombies
    this.playerCheckTimer += deltaTime;
    if (this.playerCheckTimer >= IdleMovementStrategy.PLAYER_CHECK_INTERVAL) {
      this.playerCheckTimer = 0;

      // Check for players to determine if zombie should activate
      const playerTarget = TargetingSystem.findClosestPlayer(
        zombie,
        IdleMovementStrategy.ACTIVATION_RADIUS
      );

      if (playerTarget) {
        // Check if player is within activation radius
        if (playerTarget.distance <= IdleMovementStrategy.ACTIVATION_RADIUS) {
          this.isActivated = true;
        }
      }
    }

    // If not activated yet, stay idle (don't target friendly entities)
    if (!this.isActivated) {
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
      return false;
    }

    // Once activated, find the closest friendly entity (car, player, or survivor)
    const closestFriendly = TargetingSystem.findClosestFriendlyEntity(
      zombie,
      IdleMovementStrategy.ACTIVATION_RADIUS * 2
    );

    if (closestFriendly) {
      targetPos = closestFriendly.position;
    }

    if (!targetPos) {
      // No target nearby, stay idle
      zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
      return false;
    }

    // Once activated, behave like a normal zombie
    this.pathRecalculationTimer += deltaTime;

    // If we don't have a waypoint or we've reached the current one, get a new one
    const needNewWaypoint = !this.currentWaypoint || zombiePos.distance(this.currentWaypoint) <= 1;

    // Update path periodically or when we need a new waypoint
    if (
      needNewWaypoint ||
      this.pathRecalculationTimer >= IdleMovementStrategy.PATH_RECALCULATION_INTERVAL
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
