import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { IEntity } from "@/entities/types";
export declare class Fire extends Entity {
    static get Size(): Vector2;
    constructor(gameManagers: IGameManagers);
    catchFire(entity: IEntity): void;
}
