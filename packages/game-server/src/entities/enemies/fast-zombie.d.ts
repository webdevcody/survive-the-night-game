import { IGameManagers } from "@/managers/types";
import { BaseEnemy } from "./base-enemy";
import { Cooldown } from "@/entities/util/cooldown";
export declare class FastZombie extends BaseEnemy {
    constructor(gameManagers: IGameManagers);
    getAttackCooldown(): Cooldown;
    getAttackDamage(): number;
}
