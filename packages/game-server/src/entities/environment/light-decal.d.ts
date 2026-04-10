import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
/** Map-placed invisible light (same radius as a torch on the ground). */
export declare class LightDecal extends Entity {
    static get Size(): Vector2;
    constructor(gameManagers: IGameManagers);
}
