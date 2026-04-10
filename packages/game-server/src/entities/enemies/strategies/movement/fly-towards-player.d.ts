import { BaseEnemy, MovementStrategy } from "../../base-enemy";
export declare class FlyTowardsPlayerStrategy implements MovementStrategy {
    private targetChecker;
    update(zombie: BaseEnemy, deltaTime: number): boolean;
}
