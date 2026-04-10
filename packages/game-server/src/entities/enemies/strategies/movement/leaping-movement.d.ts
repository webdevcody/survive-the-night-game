import { BaseEnemy, MovementStrategy } from "../../base-enemy";
export declare class LeapingState {
    isLeaping: boolean;
}
export declare class LeapingMovementStrategy implements MovementStrategy {
    private static readonly PATH_RECALCULATION_INTERVAL;
    private pathRecalculationTimer;
    private targetChecker;
    private currentWaypoint;
    private leapingState;
    constructor(leapingState: LeapingState);
    update(zombie: BaseEnemy, deltaTime: number): boolean;
}
