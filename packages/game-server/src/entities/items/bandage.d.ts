import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { ItemState } from "@/types/entity";
export declare class Bandage extends Entity {
    static get Size(): Vector2;
    static readonly healingAmount = 5;
    static readonly DEFAULT_COUNT = 1;
    constructor(gameManagers: IGameManagers, itemState?: ItemState);
    private consume;
    private interact;
}
