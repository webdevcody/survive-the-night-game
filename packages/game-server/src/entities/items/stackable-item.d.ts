import { IGameManagers } from "@/managers/types";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import { EntityType, ItemState } from "@/types/entity";
import { ItemType } from "@shared/util/inventory";
export declare abstract class StackableItem extends Entity {
    static get Size(): Vector2;
    /**
     * Get the default count for a StackableItem class without instantiating it.
     * Subclasses should override this static method to return their default count.
     * If not overridden, this will attempt to create a temporary instance to get the count.
     */
    static getDefaultCount(constructor: new (gameManagers: IGameManagers, ...args: any[]) => StackableItem, gameManagers: IGameManagers): number | undefined;
    constructor(gameManagers: IGameManagers, entityType: EntityType, itemType: ItemType, defaultCount: number, displayName: string, itemState?: ItemState);
    protected interact(entityId: number): void;
    protected abstract getDefaultCount(): number;
}
