import { IGameManagers } from "@/managers/types";
import { BaseEnemy } from "./base-enemy";
import { Cooldown } from "@/entities/util/cooldown";
export declare class LeapingZombie extends BaseEnemy {
    private readonly positionThreshold;
    constructor(gameManagers: IGameManagers);
    getAttackCooldown(): Cooldown;
    getAttackDamage(): number;
}
