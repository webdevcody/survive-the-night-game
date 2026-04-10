import { ItemType } from "@/util/inventory";
import { IEntity } from "@/entities/types";
import { ItemState } from "@/types/entity";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
interface PickupOptions {
    state?: ItemState;
    mergeStrategy?: (existingState: ItemState, pickupState: ItemState) => ItemState;
}
type CarryableFields = {
    itemType: ItemType;
    state: ItemState;
};
export default class Carryable extends ExtensionBase<CarryableFields> {
    static readonly type: "carryable";
    constructor(self: IEntity, itemType: ItemType);
    setItemState(state: ItemState): this;
    getItemState(): ItemState;
    getItemType(): ItemType;
    /**
     * Creates pickup options for stackable items that preserve count when dropped and picked up.
     * This ensures that when a stacked item is dropped and picked back up, it maintains its count.
     */
    static createStackablePickupOptions(carryable: Carryable, defaultCount: number): PickupOptions;
    pickup(entityId: number, options?: PickupOptions): boolean;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
