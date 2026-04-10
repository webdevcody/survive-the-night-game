import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import { IEntity } from "@/entities/types";
import { ItemState } from "@/types/entity";
/**
 * A landmine that explodes when enemies step on it, damaging all nearby enemies
 */
export declare class Landmine extends Entity implements IEntity {
    private static get SIZE();
    private static readonly TRIGGER_RADIUS;
    static readonly DEFAULT_COUNT = 1;
    private untilActive;
    constructor(gameManagers: IGameManagers, itemState?: ItemState);
    private setIsActive;
    activate(): void;
    updateLandmine(deltaTime: number): void;
    private explode;
    private interact;
}
