import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
export declare class GallonDrum extends Entity {
    static get Size(): Vector2;
    constructor(gameManagers: IGameManagers);
    private onLooted;
}
