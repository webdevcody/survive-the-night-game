import { IGameManagers } from "@/managers/types";
import { BaseEnemy } from "./base-enemy";
import { Cooldown } from "@/entities/util/cooldown";
export declare class BatZombie extends BaseEnemy {
    constructor(gameManagers: IGameManagers);
    getAttackCooldown(): Cooldown;
    getAttackDamage(): number;
}
