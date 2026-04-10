import { BaseEnemy, MovementStrategy } from "../../base-enemy";
export declare class MeleeMovementStrategy implements MovementStrategy {
    private static readonly PATH_RECALCULATION_INTERVAL;
    private static readonly STUCK_DETECTION_TIME;
    private static readonly WAYPOINT_REACHED_THRESHOLD;
    private pathRecalculationTimer;
    private targetChecker;
    private currentWaypoint;
    private lastWaypointPosition;
    private stuckTimer;
    update(zombie: BaseEnemy, deltaTime: number): boolean;
}
