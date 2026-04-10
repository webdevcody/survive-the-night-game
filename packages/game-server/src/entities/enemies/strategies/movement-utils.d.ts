import { BaseEnemy } from "../base-enemy";
import Vector2 from "@/util/vector2";
/**
 * Shared constants for movement strategies - values from entity config
 */
export declare const TARGET_CHECK_INTERVAL: 1;
export declare const FRIENDLY_SEARCH_RADIUS: 500;
/**
 * Gets the best target position for a zombie to move towards.
 * Finds the closest friendly entity (car, player, or survivor) within search radius.
 * If no friendly entity is found within the radius, falls back to car location if available.
 * @param zombie The zombie entity
 * @param carLocation The car's location (from map manager)
 * @returns The best target position, or null if no target available
 */
export declare function getBestTargetPosition(zombie: BaseEnemy, carLocation: Vector2 | null): Vector2 | null;
/**
 * Helper class to manage target checking with timer.
 * Handles the periodic checking for best target position.
 */
export declare class TargetChecker {
    private targetCheckTimer;
    private currentTarget;
    /**
     * Updates the target check timer and returns the current target.
     * If the timer has elapsed, recalculates the best target.
     * @param zombie The zombie entity
     * @param deltaTime Time elapsed since last update
     * @param carLocation The car's location (from map manager)
     * @returns The current target position, or null if no target available
     */
    updateTarget(zombie: BaseEnemy, deltaTime: number, carLocation: Vector2 | null): Vector2 | null;
    /**
     * Gets the current target without updating the timer.
     * @returns The current target position, or null if no target available
     */
    getCurrentTarget(): Vector2 | null;
    /**
     * Resets the target checker (useful for initialization or state changes).
     */
    reset(): void;
}
