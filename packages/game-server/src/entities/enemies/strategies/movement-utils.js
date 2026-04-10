import { TargetingSystem } from "./targeting";
import { getConfig } from "@shared/config";
/**
 * Shared constants for movement strategies - values from entity config
 */
export const TARGET_CHECK_INTERVAL = getConfig().entity.TARGET_CHECK_INTERVAL;
export const FRIENDLY_SEARCH_RADIUS = getConfig().entity.FRIENDLY_SEARCH_RADIUS;
/**
 * Gets the best target position for a zombie to move towards.
 * Finds the closest friendly entity (car, player, or survivor) within search radius.
 * If no friendly entity is found within the radius, falls back to car location if available.
 * @param zombie The zombie entity
 * @param carLocation The car's location (from map manager)
 * @returns The best target position, or null if no target available
 */
export function getBestTargetPosition(zombie, carLocation) {
    // Find the closest friendly entity (car, player, or survivor) within search radius
    // Note: FRIENDLY_TYPES includes "car", so the car will be found if within radius
    const closestFriendly = TargetingSystem.findClosestFriendlyEntity(zombie, FRIENDLY_SEARCH_RADIUS);
    if (closestFriendly) {
        // Found a friendly entity within search radius, use it
        return closestFriendly.position;
    }
    // No friendly entity found within search radius
    // Fall back to car location if available (even if it's far away)
    // This ensures zombies always have a target to move towards
    if (carLocation) {
        return carLocation;
    }
    // No target available at all
    return null;
}
/**
 * Helper class to manage target checking with timer.
 * Handles the periodic checking for best target position.
 */
export class TargetChecker {
    constructor() {
        this.targetCheckTimer = Math.random() * TARGET_CHECK_INTERVAL;
        this.currentTarget = null;
    }
    /**
     * Updates the target check timer and returns the current target.
     * If the timer has elapsed, recalculates the best target.
     * @param zombie The zombie entity
     * @param deltaTime Time elapsed since last update
     * @param carLocation The car's location (from map manager)
     * @returns The current target position, or null if no target available
     */
    updateTarget(zombie, deltaTime, carLocation) {
        this.targetCheckTimer += deltaTime;
        // Initialize target immediately if we don't have one yet
        // This ensures zombies start moving right away instead of waiting for the timer
        if (this.currentTarget === null) {
            this.currentTarget = getBestTargetPosition(zombie, carLocation);
        }
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
    getCurrentTarget() {
        return this.currentTarget;
    }
    /**
     * Resets the target checker (useful for initialization or state changes).
     */
    reset() {
        this.targetCheckTimer = Math.random() * TARGET_CHECK_INTERVAL;
        this.currentTarget = null;
    }
}
