import { IGameManagers } from "@/managers/types";
import { Weapon } from "@/entities/weapons/weapon";
import { Direction } from "../../../../game-shared/src/util/direction";
import Vector2 from "@/util/vector2";
export declare class Bow extends Weapon {
    constructor(gameManagers: IGameManagers);
    getCooldown(): number;
    attack(playerId: number, position: Vector2, facing: Direction, aimAngle?: number): void;
}
