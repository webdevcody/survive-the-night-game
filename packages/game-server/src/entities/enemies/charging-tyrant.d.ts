import { BossEnemy } from "./boss-enemy";
import { IGameManagers } from "@/managers/types";
export declare class ChargingTyrant extends BossEnemy {
    private chargeConfig;
    private state;
    private recoveryCooldown;
    private chargingMovementStrategy;
    private walkingMovementStrategy;
    private groundSlamStrategy;
    private chargeTarget;
    private lastChargePosition;
    private wallCollisionTimer;
    constructor(gameManagers: IGameManagers);
    protected updateEnemy(deltaTime: number): void;
    handleMovement(deltaTime: number): void;
    private detectWallCollision;
    private updateChargingBehavior;
    private performGroundSlam;
}
