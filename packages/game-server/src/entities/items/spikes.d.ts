import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { ItemState } from "@/types/entity";
/**
 * A spike trap which only hurts zombies who step on it. Can be picked up and placed again.
 */
export declare class Spikes extends Entity {
    private static get SIZE();
    static readonly DEFAULT_COUNT = 1;
    constructor(gameManagers: IGameManagers, itemState?: ItemState);
    private interact;
}
