import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
export declare class Torch extends Entity {
    static readonly DEFAULT_COUNT = 1;
    static get Size(): Vector2;
    constructor(gameManagers: IGameManagers);
    private interact;
}
