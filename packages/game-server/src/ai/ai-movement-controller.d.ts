import Vector2 from "@/util/vector2";
import { Input } from "@shared/util/input";
import { AIPathfinder } from "./ai-pathfinding";
import { AITimerManager } from "./ai-timer-manager";
/**
 * Handles AI movement including waypoint following, stuck detection, and movement smoothing
 */
export declare class AIMovementController {
    private pathfinder;
    private timerManager;
    private currentWaypoint;
    private lastPosition;
    private stuckCount;
    private lastMovementDirection;
    constructor(pathfinder: AIPathfinder, timerManager: AITimerManager);
    /**
     * Get current waypoint
     */
    getCurrentWaypoint(): Vector2 | null;
    /**
     * Set current waypoint
     */
    setCurrentWaypoint(waypoint: Vector2 | null): void;
    /**
     * Clear current waypoint
     */
    clearWaypoint(): void;
    /**
     * Move toward a target position using pathfinding
     * Returns true if movement was generated, false otherwise
     */
    moveTowardTarget(input: Input, playerPos: Vector2, targetPos: Vector2, recalcInterval?: number): boolean;
    /**
     * Check if AI is stuck and handle it
     * Returns true if stuck and handled, false otherwise
     */
    checkIfStuck(playerPos: Vector2, stuckDistanceThreshold: number, maxStuckAttempts: number, onStuck: () => void): boolean;
    /**
     * Smooth movement to avoid jerkiness
     */
    smoothMovement(input: Input, smoothingFactor?: number): void;
    /**
     * Determine facing direction from velocity
     */
    private determineFacing;
    /**
     * Reset stuck detection
     */
    resetStuckDetection(): void;
}
