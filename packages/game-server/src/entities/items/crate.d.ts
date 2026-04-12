import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { type ZombieDropTableEntry } from "@shared/config/zombie-drop-tables";
export declare class Crate extends Entity {
    private readonly isLocked;
    static get Size(): Vector2;
    constructor(gameManagers: IGameManagers, itemCount?: number, dropTable?: ZombieDropTableEntry[]);
    private onLooted;
}
