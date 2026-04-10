import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { EntityType } from "@/types/entity";
import Vector2 from "@/util/vector2";
import { ResourceConfig } from "@shared/entities/resource-registry";
/**
 * Generic resource entity that can be auto-generated from ResourceConfig.
 * Pickup merges into the player's inventory as a stackable item (item id matches resource id).
 */
export declare class GenericResourceEntity extends Entity {
    static get Size(): Vector2;
    constructor(gameManagers: IGameManagers, entityType: EntityType, config: ResourceConfig);
    private interact;
}
