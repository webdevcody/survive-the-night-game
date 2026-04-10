import { BaseEnemy, MovementStrategy } from "../../base-enemy";
export declare class RangedMovementStrategy implements MovementStrategy {
    private static readonly ATTACK_RANGE;
    private static readonly PATH_RECALCULATION_INTERVAL;
    private pathRecalculationTimer;
    private targetChecker;
    private currentWaypoint;
    update(zombie: BaseEnemy, deltaTime: number): boolean;
}
