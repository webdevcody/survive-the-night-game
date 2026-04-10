import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { ItemState } from "@/types/entity";
import Vector2 from "@/util/vector2";
export declare class Wall extends Entity {
    static get Size(): Vector2;
    static readonly DEFAULT_COUNT = 1;
    constructor(gameManagers: IGameManagers, itemState?: ItemState);
    private interact;
    private onDeath;
}
