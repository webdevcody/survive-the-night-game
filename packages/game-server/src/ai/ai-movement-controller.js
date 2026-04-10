import Vector2 from "@/util/vector2";
import { distance, velocityTowards } from "@shared/util/physics";
import { Direction } from "@/util/direction";
import { AI_CONFIG } from "./ai-config";
/**
 * Handles AI movement including waypoint following, stuck detection, and movement smoothing
 */
export class AIMovementController {
    constructor(pathfinder, timerManager) {
        // Current waypoint
        this.currentWaypoint = null;
        // Stuck detection
        this.lastPosition = null;
        this.stuckCount = 0;
        // Movement smoothing
        this.lastMovementDirection = new Vector2(0, 0);
        this.pathfinder = pathfinder;
        this.timerManager = timerManager;
    }
    /**
     * Get current waypoint
     */
    getCurrentWaypoint() {
        return this.currentWaypoint;
    }
    /**
     * Set current waypoint
     */
    setCurrentWaypoint(waypoint) {
        this.currentWaypoint = waypoint;
    }
    /**
     * Clear current waypoint
     */
    clearWaypoint() {
        this.currentWaypoint = null;
    }
    /**
     * Move toward a target position using pathfinding
     * Returns true if movement was generated, false otherwise
     */
    moveTowardTarget(input, playerPos, targetPos, recalcInterval = AI_CONFIG.PATH_RECALC_INTERVAL) {
        // Recalculate path if needed
        if (this.timerManager.pathRecalcTimer >= recalcInterval || !this.currentWaypoint) {
            this.timerManager.pathRecalcTimer = 0;
            this.currentWaypoint = this.pathfinder.pathTowardsAvoidingToxic(playerPos, targetPos);
            // If pathfinding failed, use direct path
            if (!this.currentWaypoint) {
                this.currentWaypoint = targetPos;
            }
        }
        // Move toward waypoint
        if (this.currentWaypoint) {
            const waypointDist = distance(playerPos, this.currentWaypoint);
            if (waypointDist < AI_CONFIG.WAYPOINT_THRESHOLD) {
                // Reached waypoint, recalculate
                this.currentWaypoint = null;
                return false;
            }
            else {
                const vel = velocityTowards(playerPos, this.currentWaypoint);
                input.dx = vel.x;
                input.dy = vel.y;
                input.facing = this.determineFacing(vel);
                return true;
            }
        }
        return false;
    }
    /**
     * Check if AI is stuck and handle it
     * Returns true if stuck and handled, false otherwise
     */
    checkIfStuck(playerPos, stuckDistanceThreshold, maxStuckAttempts, onStuck) {
        if (!this.lastPosition) {
            this.lastPosition = new Vector2(playerPos.x, playerPos.y);
            return false;
        }
        const moved = distance(playerPos, this.lastPosition);
        if (moved < stuckDistanceThreshold) {
            this.stuckCount++;
            // If stuck too many times, call handler
            if (this.stuckCount >= maxStuckAttempts) {
                this.currentWaypoint = null;
                this.stuckCount = 0;
                onStuck();
                this.lastPosition = new Vector2(playerPos.x, playerPos.y);
                return true;
            }
        }
        else {
            this.stuckCount = 0;
        }
        this.lastPosition = new Vector2(playerPos.x, playerPos.y);
        return false;
    }
    /**
     * Smooth movement to avoid jerkiness
     */
    smoothMovement(input, smoothingFactor = 0.7) {
        // Smooth the movement direction
        const targetDir = new Vector2(input.dx, input.dy);
        const targetLength = Math.sqrt(targetDir.x * targetDir.x + targetDir.y * targetDir.y);
        if (targetLength > 0) {
            // Normalize target direction
            targetDir.x /= targetLength;
            targetDir.y /= targetLength;
            // Smooth with previous direction
            this.lastMovementDirection.x =
                this.lastMovementDirection.x * smoothingFactor + targetDir.x * (1 - smoothingFactor);
            this.lastMovementDirection.y =
                this.lastMovementDirection.y * smoothingFactor + targetDir.y * (1 - smoothingFactor);
            // Normalize smoothed direction
            const smoothedLength = Math.sqrt(this.lastMovementDirection.x * this.lastMovementDirection.x +
                this.lastMovementDirection.y * this.lastMovementDirection.y);
            if (smoothedLength > 0) {
                this.lastMovementDirection.x /= smoothedLength;
                this.lastMovementDirection.y /= smoothedLength;
                // Apply smoothed direction with original magnitude
                input.dx = this.lastMovementDirection.x * targetLength;
                input.dy = this.lastMovementDirection.y * targetLength;
            }
        }
    }
    /**
     * Determine facing direction from velocity
     */
    determineFacing(vel) {
        const absX = Math.abs(vel.x);
        const absY = Math.abs(vel.y);
        if (absX > absY) {
            return vel.x > 0 ? Direction.Right : Direction.Left;
        }
        else {
            return vel.y > 0 ? Direction.Down : Direction.Up;
        }
    }
    /**
     * Reset stuck detection
     */
    resetStuckDetection() {
        this.stuckCount = 0;
        this.lastPosition = null;
    }
}
