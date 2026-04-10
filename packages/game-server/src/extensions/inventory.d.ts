import { InventoryItem, ItemType, type EquipmentSlotKey, type PlayerEquipmentState } from "../../../game-shared/src/util/inventory";
import { RecipeType } from "../../../game-shared/src/util/recipes";
import { Broadcaster } from "@/managers/types";
import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
type InventoryFields = {
    items: (InventoryItem | null)[];
    equipment: PlayerEquipmentState;
};
export default class Inventory extends ExtensionBase<InventoryFields> {
    static readonly type = "inventory";
    private broadcaster;
    private notifyPlayerWeaponLoadout;
    constructor(self: IEntity, broadcaster: Broadcaster);
    getEquipment(): PlayerEquipmentState;
    getItems(): (InventoryItem | null)[];
    /** Bag slot cap (base + player strength when attached to a Player). */
    getMaxSlots(): number;
    isFull(): boolean;
    hasItem(itemType: ItemType): boolean;
    addItem(item: InventoryItem): void;
    /**
     * Sum stack counts in the bag for an item type (non-stackable items count as 1).
     */
    getTotalCount(itemType: ItemType): number;
    /**
     * Merge into an existing stack of the same type, or add a new slot.
     * When the bag is full, still succeeds if an existing stack can absorb the item (same as Carryable).
     */
    addOrMergeStack(item: InventoryItem): boolean;
    /**
     * Remove a total amount of an item type across bag stacks (e.g. paying with coins).
     * Returns true if at least `amount` was removed.
     */
    removeCountAcrossStacks(itemType: ItemType, amount: number): boolean;
    removeItem(index: number): InventoryItem | undefined;
    updateItemState(index: number, state: any): void;
    private mutateSwapBagSlots;
    swapItems(fromIndex: number, toIndex: number): void;
    /**
     * Swap two bag cells without running weapon-loadout sanitize.
     * Caller must update loadout indices then call player.sanitizeWeaponLoadouts().
     */
    swapBagSlotsDeferWeaponResync(fromIndex: number, toIndex: number): void;
    /**
     * Swap bag slot with an equipment slot. Validates the item entering equipment.
     */
    swapBagAndEquipment(bagIndex: number, equipSlot: EquipmentSlotKey): void;
    getActiveItem(index: number | null): InventoryItem | null;
    getActiveWeapon(activeItem: InventoryItem | null): InventoryItem | null;
    /** Weapon in the active bag slot (no separate weapon equipment slot). */
    resolveActiveWeapon(activeBagItem: InventoryItem | null): InventoryItem | null;
    craftRecipe(recipe: RecipeType): {
        inventory: (InventoryItem | null)[];
        itemToDrop?: InventoryItem;
    };
    addRandomItem(chance?: number, dropTable?: Array<{
        itemType: ItemType;
        weight: number;
    }>): this;
    /**
     * Selects a random item from the drop table based on weighted probabilities.
     * Items with higher weights have a higher chance of being selected.
     */
    private getWeightedRandomItem;
    clear(): void;
    scatterItems(position: {
        x: number;
        y: number;
    }): void;
    private createEntityFromItem;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
