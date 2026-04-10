import { BaseEnemy, MovementStrategy } from "../../base-enemy";
export declare class ChargingMovementStrategy implements MovementStrategy {
    private chargeSpeedMultiplier;
    constructor(chargeSpeedMultiplier?: number);
    update(zombie: BaseEnemy, deltaTime: number): boolean;
}
