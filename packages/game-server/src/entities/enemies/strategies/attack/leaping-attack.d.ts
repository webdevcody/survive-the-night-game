import { BaseEnemy, AttackStrategy } from "../../base-enemy";
import { IEntity } from "@/entities/types";
import { LeapConfig } from "@shared/entities";
import { LeapingState } from "../movement/leaping-movement";
export declare class LeapingAttackStrategy implements AttackStrategy {
    private leapCooldown;
    private leapDuration;
    private leapingState;
    private leapConfig;
    onEntityDamaged?: (entity: IEntity) => void;
    constructor(leapingState: LeapingState, leapConfig: LeapConfig);
    update(zombie: BaseEnemy, deltaTime: number): void;
}
