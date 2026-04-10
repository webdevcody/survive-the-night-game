import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import { EntityType } from "@/types/entity";
import Vector2 from "@/util/vector2";
import { ItemConfig } from "@shared/entities/item-registry";
/**
 * Generic item entity that can be auto-generated from ItemConfig
 * Used as a fallback when no custom entity class exists
 */
export declare class GenericItemEntity extends Entity {
    static get Size(): Vector2;
    constructor(gameManagers: IGameManagers, entityType: EntityType, config: ItemConfig);
    private interact;
}
