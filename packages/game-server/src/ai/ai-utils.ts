import Vector2 from "@shared/util/vector2";
import { velocityTowards } from "@shared/util/physics";
import { Input } from "@shared/util/input";
import { getConfig } from "@shared/config";
import { AI_CONFIG, WEAPON_RANGES } from "./ai-config";
import { AITarget } from "./ai-targeting";
import { AIPathfinder } from "./ai-pathfinding";
import { Player } from "@/entities/players/player";
import { InventoryItem } from "@shared/util/inventory";
import { AIStateMachine } from "./ai-state-machine";
import { Direction } from "@/util/direction";

/**
 * AI Utility Functions - Common logic extracted to DRY up the codebase
 */

/**
 * Get the effective shooting range for a weapon
 * Takes into account both weapon range and bullet travel distance
 * Bullets can only travel TRAVEL_DISTANCE_MEDIUM (100px), so we use the minimum
 */
export function getEffectiveShootingRange(weaponType?: string): number {
  const weaponRange = weaponType ? WEAPON_RANGES[weaponType] || 200 : 200;
  const bulletMaxTravel = getConfig().combat.TRAVEL_DISTANCE_MEDIUM;
  // Use the minimum of weapon range and bullet travel distance
  return Math.min(weaponRange, bulletMaxTravel);
}

/**
 * Get the actual melee attack range for the current weapon
 * Returns the configured range for knife/bat, or default MELEE_RANGE
 */
export function getMeleeAttackRange(activeItem?: { itemType?: string }): number {
  if (activeItem?.itemType === "knife") {
    return getConfig().combat.KNIFE_ATTACK_RANGE;
  } else if (activeItem?.itemType === "baseball_bat") {
    return getConfig().combat.BASEBALL_BAT_ATTACK_RANGE;
  }
  return AI_CONFIG.MELEE_RANGE;
}

/**
 * Get melee range with a small buffer to account for movement during attack animation
 */
export function getMeleeRangeWithBuffer(activeItem?: { itemType?: string }): number {
  return getMeleeAttackRange(activeItem) + 2;
}

/**
 * Calculate a retreat position away from an enemy
 */
export function calculateRetreatPosition(
  playerPos: Vector2,
  enemyPos: Vector2,
  dist: number
): Vector2 {
  const awayDir = velocityTowards(enemyPos, playerPos);
  return new Vector2(playerPos.x + awayDir.x * dist, playerPos.y + awayDir.y * dist);
}

/**
 * Move toward a waypoint using pathfinding
 * Returns true if movement was generated, false if waypoint was null or reached
 */
export function moveTowardWaypoint(
  input: Input,
  playerPos: Vector2,
  currentWaypoint: Vector2 | null,
  waypointThreshold: number = AI_CONFIG.WAYPOINT_THRESHOLD
): boolean {
  if (!currentWaypoint) return false;

  const dist = velocityTowards(playerPos, currentWaypoint);
  const distance = Math.sqrt(dist.x * dist.x + dist.y * dist.y);

  // Check if we've reached the waypoint
  if (distance < waypointThreshold) {
    return false; // Waypoint reached
  }

  input.dx = dist.x;
  input.dy = dist.y;
  return true;
}

/**
 * Move toward a waypoint with automatic path recalculation if reached
 * Returns true if movement was generated, false otherwise
 */
export function moveTowardWaypointWithRecalc(
  input: Input,
  playerPos: Vector2,
  currentWaypoint: Vector2 | null,
  recalculatePath: () => void,
  getNewWaypoint: () => Vector2 | null,
  waypointThreshold: number = AI_CONFIG.WAYPOINT_THRESHOLD
): boolean {
  if (!currentWaypoint) {
    recalculatePath();
    const newWaypoint = getNewWaypoint();
    if (newWaypoint) {
      const velocity = velocityTowards(playerPos, newWaypoint);
      input.dx = velocity.x;
      input.dy = velocity.y;
      return true;
    }
    return false;
  }

  const dist = velocityTowards(playerPos, currentWaypoint);
  const distance = Math.sqrt(dist.x * dist.x + dist.y * dist.y);

  // Check if we've reached the waypoint
  if (distance < waypointThreshold) {
    recalculatePath();
    const newWaypoint = getNewWaypoint();
    if (newWaypoint) {
      const velocity = velocityTowards(playerPos, newWaypoint);
      input.dx = velocity.x;
      input.dy = velocity.y;
      return true;
    }
    return false;
  }

  input.dx = dist.x;
  input.dy = dist.y;
  return true;
}

/**
 * Move toward a retreat target using pathfinding
 * Handles the common pattern of calculating retreat position, finding waypoint, and moving
 */
export function moveTowardRetreatTarget(
  input: Input,
  playerPos: Vector2,
  enemyPos: Vector2,
  retreatDistance: number,
  pathfinder: AIPathfinder,
  safestRetreatDirection: Vector2 | null = null,
  currentWaypoint: Vector2 | null = null
): Vector2 | null {
  // Calculate retreat target position
  let retreatTarget: Vector2;
  if (safestRetreatDirection) {
    retreatTarget = new Vector2(
      playerPos.x + safestRetreatDirection.x * retreatDistance,
      playerPos.y + safestRetreatDirection.y * retreatDistance
    );
  } else {
    retreatTarget = calculateRetreatPosition(playerPos, enemyPos, retreatDistance);
  }

  // Find walkable waypoint using pathfinding
  const retreatWaypoint = pathfinder.pathTowardsAvoidingToxic(playerPos, retreatTarget);

  if (retreatWaypoint) {
    const vel = velocityTowards(playerPos, retreatWaypoint);
    input.dx = vel.x;
    input.dy = vel.y;
    return retreatWaypoint;
  }

  // Fallback to current waypoint if available
  if (currentWaypoint) {
    const vel = velocityTowards(playerPos, currentWaypoint);
    input.dx = vel.x;
    input.dy = vel.y;
    return currentWaypoint;
  }

  return null;
}

/**
 * Move toward a retreat target with fallback path recalculation
 * More robust version that tries to recalculate path if initial attempt fails
 */
export function moveTowardRetreatTargetWithFallback(
  input: Input,
  playerPos: Vector2,
  enemyPos: Vector2,
  retreatDistance: number,
  pathfinder: AIPathfinder,
  safestRetreatDirection: Vector2 | null = null,
  currentWaypoint: Vector2 | null = null,
  recalculatePath: () => void,
  getNewWaypoint: () => Vector2 | null
): void {
  const waypoint = moveTowardRetreatTarget(
    input,
    playerPos,
    enemyPos,
    retreatDistance,
    pathfinder,
    safestRetreatDirection,
    currentWaypoint
  );

  if (!waypoint) {
    // No path found - try to recalculate
    recalculatePath();
    const newWaypoint = getNewWaypoint();
    if (newWaypoint) {
      const vel = velocityTowards(playerPos, newWaypoint);
      input.dx = vel.x;
      input.dy = vel.y;
    }
    // If still no waypoint, don't move (better than running into obstacles)
  }
}

/**
 * Equip best melee weapon for crate destruction
 * Prioritizes knife, falls back to best available weapon
 */
export function equipMeleeWeaponForCrate(
  player: Player,
  inventory: InventoryItem[],
  stateMachine: AIStateMachine
): void {
  const knifeIndex = inventory.findIndex((item) => item && item.itemType === "knife");

  if (knifeIndex >= 0) {
    player.selectInventoryItem(knifeIndex + 1);
  } else {
    // Fallback to best weapon if no knife
    const weaponIndex = stateMachine.getBestWeaponIndex(inventory);
    if (weaponIndex > 0) {
      player.selectInventoryItem(weaponIndex);
    }
  }
}

/**
 * Calculate aim angle from source to target
 */
export function calculateAimAngle(source: Vector2, target: Vector2): number {
  return Math.atan2(target.y - source.y, target.x - source.x);
}

/**
 * Convert angle to direction (for facing)
 */
export function angleToDirection(angle: number): Direction {
  const normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  if (normalized < Math.PI / 4 || normalized >= (7 * Math.PI) / 4) {
    return Direction.Right;
  } else if (normalized < (3 * Math.PI) / 4) {
    return Direction.Down;
  } else if (normalized < (5 * Math.PI) / 4) {
    return Direction.Left;
  } else {
    return Direction.Up;
  }
}

/**
 * Set aim and facing direction toward a target position
 */
export function aimAtTarget(input: Input, playerPos: Vector2, targetPos: Vector2): void {
  const aimAngle = calculateAimAngle(playerPos, targetPos);
  input.aimAngle = aimAngle;
  input.facing = angleToDirection(aimAngle);
}

/**
 * Set aim and facing direction toward a target with inaccuracy
 */
export function aimAtTargetWithInaccuracy(
  input: Input,
  playerPos: Vector2,
  targetPos: Vector2,
  inaccuracy: number
): void {
  const baseAngle = calculateAimAngle(playerPos, targetPos);
  const inaccuracyOffset = (Math.random() - 0.5) * inaccuracy;
  input.aimAngle = baseAngle + inaccuracyOffset;
  input.facing = angleToDirection(baseAngle);
}
