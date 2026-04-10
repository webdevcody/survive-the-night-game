/**
 * Centralized timer management for AI controllers
 * Tracks all timers used by AI decision-making and behavior
 */
export declare class AITimerManager {
    decisionTimer: number;
    pathRecalcTimer: number;
    interactTimer: number;
    stuckCheckTimer: number;
    fireTimer: number;
    retargetTimer: number;
    reactionTimer: number;
    inventoryManagementTimer: number;
    /**
     * Update all timers by deltaTime
     */
    update(deltaTime: number): void;
    /**
     * Reset a specific timer
     */
    reset(timerName: keyof AITimerManager): void;
    /**
     * Reset all timers
     */
    resetAll(): void;
}
