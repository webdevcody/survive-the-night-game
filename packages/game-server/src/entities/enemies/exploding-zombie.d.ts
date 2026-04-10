import { IGameManagers } from "@/managers/types";
import { BaseEnemy } from "./base-enemy";
import { Cooldown } from "@/entities/util/cooldown";
import { IEntity } from "../types";
export declare class ExplodingZombie extends BaseEnemy {
    private static readonly EXPLOSION_RADIUS;
    constructor(gameManagers: IGameManagers);
    getAttackCooldown(): Cooldown;
    getAttackDamage(): number;
    onEntityDamaged(entity: IEntity): void;
}
