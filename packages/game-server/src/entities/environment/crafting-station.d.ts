import { Entity } from "@/entities/entity";
import type { IGameManagers } from "@/managers/types";
import Vector2 from "@/util/vector2";
export declare class CraftingStation extends Entity {
    static get Size(): Vector2;
    constructor(gameManagers: IGameManagers, entityType: string, displayName: string);
    setPosition(position: Vector2): void;
}
