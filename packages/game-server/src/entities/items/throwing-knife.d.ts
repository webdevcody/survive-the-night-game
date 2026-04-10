import { IGameManagers } from "@/managers/types";
import { Direction } from "@shared/util/direction";
import { Weapon } from "@/entities/weapons/weapon";
import { ItemState } from "@/types/entity";
export declare class ThrowingKnife extends Weapon {
    private static readonly COOLDOWN;
    static readonly DEFAULT_COUNT = 5;
    constructor(gameManagers: IGameManagers, itemState?: ItemState);
    getCooldown(): number;
    attack(playerId: number, position: {
        x: number;
        y: number;
    }, facing: Direction, aimAngle?: number): void;
}
