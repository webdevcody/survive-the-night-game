import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
export declare class Car extends Entity {
    static get Size(): Vector2;
    private static readonly INITIAL_HEALTH;
    private static readonly ATTACK_MESSAGE_COOLDOWN;
    private static readonly REPAIR_COOLDOWN;
    private lastAttackMessageTime;
    private playerRepairTimes;
    constructor(gameManagers: IGameManagers);
    private onDamaged;
    private onDeath;
    private onRepair;
}
