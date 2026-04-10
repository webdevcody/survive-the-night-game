import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { ItemState } from "@/types/entity";
/**
 * Level 2 spikes that deal 2 damage to zombies.
 */
export declare class SpikesLevel2 extends Entity {
    private static get SIZE();
    static readonly DEFAULT_COUNT = 1;
    constructor(gameManagers: IGameManagers, itemState?: ItemState);
    private interact;
}
