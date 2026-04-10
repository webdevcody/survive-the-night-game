import { BaseEnemy, MovementStrategy } from "../../base-enemy";
/**
 * Movement strategy that flies directly towards the car (not players).
 * Used by flying enemies that should target the car specifically.
 */
export declare class FlyTowardsCarStrategy implements MovementStrategy {
    update(zombie: BaseEnemy, deltaTime: number): boolean;
}
