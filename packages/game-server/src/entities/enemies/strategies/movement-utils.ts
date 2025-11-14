import { BaseEnemy } from "../base-enemy";
import Vector2 from "@/util/vector2";
import { TargetingSystem } from "./targeting";

/**
 * Shared constants for movement strategies
 */
export const TARGET_CHECK_INTERVAL = 1; // Check for friendly entities every second
export const FRIENDLY_SEARCH_RADIUS = 500; // Search radius for friendly entities

/**
 * Gets the best target position for a zombie to move towards.
 * Prioritizes closer friendly entities over the car, but defaults to car if no friendly entities found.
 * @param zombie The zombie entity
 * @param carLocation The car's location (from map manager)
 * @returns The best target position, or null if no target available
 */
export function getBestTargetPosition(
  zombie: BaseEnemy,
  carLocation: Vector2 | null
): Vector2 | null {
  const zombiePos = zombie.getCenterPosition();

  // Find the closest friendly entity (car, player, or survivor)
  const closestFriendly = TargetingSystem.findClosestFriendlyEntity(zombie, FRIENDLY_SEARCH_RADIUS);

  if (closestFriendly && carLocation) {
    // Compare distances and choose the closer target
    const friendlyDistance = closestFriendly.distance;
    const carDistance = zombiePos.distance(carLocation);
    return friendlyDistance < carDistance ? closestFriendly.position : carLocation;
  } else if (closestFriendly) {
    // No car, use friendly entity
    return closestFriendly.position;
  } else if (carLocation) {
    // No friendly entity, use car
    return carLocation;
  } else {
    // No target available
    return null;
  }
}

/**
 * Helper class to manage target checking with timer.
 * Handles the periodic checking for best target position.
 */
export class TargetChecker {
  private targetCheckTimer: number = Math.random() * TARGET_CHECK_INTERVAL;
  private currentTarget: Vector2 | null = null;

  /**
   * Updates the target check timer and returns the current target.
   * If the timer has elapsed, recalculates the best target.
   * @param zombie The zombie entity
   * @param deltaTime Time elapsed since last update
   * @param carLocation The car's location (from map manager)
   * @returns The current target position, or null if no target available
   */
  updateTarget(
    zombie: BaseEnemy,
    deltaTime: number,
    carLocation: Vector2 | null
  ): Vector2 | null {
    this.targetCheckTimer += deltaTime;

    // Every second, check for closest friendly entities and compare with car
    if (this.targetCheckTimer >= TARGET_CHECK_INTERVAL) {
      this.targetCheckTimer = 0;
      this.currentTarget = getBestTargetPosition(zombie, carLocation);
    }

    return this.currentTarget;
  }

  /**
   * Gets the current target without updating the timer.
   * @returns The current target position, or null if no target available
   */
  getCurrentTarget(): Vector2 | null {
    return this.currentTarget;
  }

  /**
   * Resets the target checker (useful for initialization or state changes).
   */
  reset(): void {
    this.targetCheckTimer = Math.random() * TARGET_CHECK_INTERVAL;
    this.currentTarget = null;
  }
}

