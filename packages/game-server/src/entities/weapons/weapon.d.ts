import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { WeaponKey } from "../../../../game-shared/src/util/inventory";
import { Direction } from "../../../../game-shared/src/util/direction";
import Vector2 from "@/util/vector2";
import { WeaponConfig } from "@shared/entities";
import type { IEntity } from "@/entities/types";
export declare abstract class Weapon extends Entity {
    static get Size(): Vector2;
    constructor(gameManagers: IGameManagers, weaponKey: WeaponKey);
    private interact;
    getConfig(): WeaponConfig;
    abstract attack(playerId: number, position: {
        x: number;
        y: number;
    }, facing: Direction, aimAngle?: number, aimDistance?: number): void;
    abstract getCooldown(): number;
    protected applyRecoil(player: IEntity, facing: Direction, aimAngle: number | undefined, strengthScale?: number): void;
}
