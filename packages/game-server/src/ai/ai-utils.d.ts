import Vector2 from "@shared/util/vector2";
import { Input } from "@shared/util/input";
import { AIPathfinder } from "./ai-pathfinding";
import { Player } from "@/entities/players/player";
import { InventoryItem } from "@shared/util/inventory";
import { AIStateMachine } from "./ai-state-machine";
import { Direction } from "@/util/direction";
/**
 * AI Utility Functions - Common logic extracted to DRY up the codebase
 */
/**
 * Assign loadout slots to a bag index and activate the matching loadout (primary vs melee).
 */
export declare function equipBagSlotViaLoadout(player: Player, bagIndex1Based: number): void;
/**
 * Get the effective shooting range for a weapon
 * Takes into account both weapon range and bullet travel distance
 * Bullets can only travel TRAVEL_DISTANCE_MEDIUM (100px), so we use the minimum
 */
export declare function getEffectiveShootingRange(weaponType?: string): number;
/**
 * Get the actual melee attack range for the current weapon
 * Returns the configured range for knife/bat, or default MELEE_RANGE
 */
export declare function getMeleeAttackRange(activeItem?: {
    itemType?: string;
}): number;
/**
 * Get melee range with a small buffer to account for movement during attack animation
 */
export declare function getMeleeRangeWithBuffer(activeItem?: {
    itemType?: string;
}): number;
/**
 * Calculate a retreat position away from an enemy
 */
export declare function calculateRetreatPosition(playerPos: Vector2, enemyPos: Vector2, dist: number): Vector2;
/**
 * Move toward a waypoint using pathfinding
 * Returns true if movement was generated, false if waypoint was null or reached
 */
export declare function moveTowardWaypoint(input: Input, playerPos: Vector2, currentWaypoint: Vector2 | null, waypointThreshold?: number): boolean;
/**
 * Move toward a waypoint with automatic path recalculation if reached
 * Returns true if movement was generated, false otherwise
 */
export declare function moveTowardWaypointWithRecalc(input: Input, playerPos: Vector2, currentWaypoint: Vector2 | null, recalculatePath: () => void, getNewWaypoint: () => Vector2 | null, waypointThreshold?: number): boolean;
/**
 * Move toward a retreat target using pathfinding
 * Handles the common pattern of calculating retreat position, finding waypoint, and moving
 */
export declare function moveTowardRetreatTarget(input: Input, playerPos: Vector2, enemyPos: Vector2, retreatDistance: number, pathfinder: AIPathfinder, safestRetreatDirection?: Vector2 | null, currentWaypoint?: Vector2 | null): Vector2 | null;
/**
 * Move toward a retreat target with fallback path recalculation
 * More robust version that tries to recalculate path if initial attempt fails
 */
export declare function moveTowardRetreatTargetWithFallback(input: Input, playerPos: Vector2, enemyPos: Vector2, retreatDistance: number, pathfinder: AIPathfinder, safestRetreatDirection: (Vector2 | null) | undefined, currentWaypoint: (Vector2 | null) | undefined, recalculatePath: () => void, getNewWaypoint: () => Vector2 | null): void;
/**
 * Equip best melee weapon for crate destruction
 * Prioritizes knife, falls back to best available weapon
 */
export declare function equipMeleeWeaponForCrate(player: Player, inventory: InventoryItem[], stateMachine: AIStateMachine): void;
/**
 * Calculate aim angle from source to target
 */
export declare function calculateAimAngle(source: Vector2, target: Vector2): number;
/**
 * Convert angle to direction (for facing)
 */
export declare function angleToDirection(angle: number): Direction;
/**
 * Set aim and facing direction toward a target position
 */
export declare function aimAtTarget(input: Input, playerPos: Vector2, targetPos: Vector2): void;
/**
 * Set aim and facing direction toward a target with inaccuracy
 */
export declare function aimAtTargetWithInaccuracy(input: Input, playerPos: Vector2, targetPos: Vector2, inaccuracy: number): void;
