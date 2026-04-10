import { BaseEnemy, MovementStrategy } from "../../base-enemy";
export interface CrossDiveConfig {
    approachDistance: number;
    diveCooldownDuration: number;
    acidDropInterval: number;
}
/**
 * Strategy that flies towards the car until close enough, then switches to dive strategy.
 */
export declare class AcidFlyerApproachStrategy implements MovementStrategy {
    private config;
    private flyStrategy;
    constructor(config: CrossDiveConfig);
    update(zombie: BaseEnemy, deltaTime: number): boolean;
}
/**
 * Strategy that performs the cross dive pattern and drops acid.
 * Switches back to approach strategy when dive is complete.
 */
export declare class AcidFlyerDiveStrategy implements MovementStrategy {
    private config;
    private acidDropCooldown;
    private segmentStartTime;
    private segmentDuration;
    private currentSegment;
    private diveTarget;
    private diveEndTarget;
    private hasStartedDive;
    private corners;
    constructor(config: CrossDiveConfig);
    update(zombie: BaseEnemy, deltaTime: number): boolean;
    private initializeDive;
    private startNextSegment;
    private performDiveMovement;
    private interpolateDiveTarget;
    private dropAcid;
    private cleanup;
}
