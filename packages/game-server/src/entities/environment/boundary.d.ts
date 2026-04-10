import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
export declare class Boundary extends Entity {
    static get Size(): Vector2;
    constructor(gameManagers: IGameManagers);
    setPosition(position: Vector2): void;
    setSize(size: Vector2): void;
}
