import { isWeapon, canItemGoInEquipmentSlot, createEmptyEquipment, EQUIPMENT_SLOT_KEYS, } from "../../../game-shared/src/util/inventory";
import { recipes } from "../../../game-shared/src/util/recipes";
import { PlayerPickedUpItemEvent } from "../../../game-shared/src/events/server-sent/events/pickup-item-event";
import Positionable from "@/extensions/positionable";
import PoolManager from "@shared/util/pool-manager";
import { getConfig } from "@/config";
import { FISTS_INVENTORY_SENTINEL } from "@shared/constants/inventory-sentinel";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { itemTypeRegistry } from "@shared/util/item-type-encoding";
import { writeItemState } from "@shared/util/item-state-serialization";
import { LEGACY_RANDOM_DROP_TABLE } from "@shared/config/zombie-drop-tables";
import { ExtensionBase } from "./extension-base";
class Inventory extends ExtensionBase {
    notifyPlayerWeaponLoadout() {
        var _a;
        const owner = this.self;
        (_a = owner.sanitizeWeaponLoadouts) === null || _a === void 0 ? void 0 : _a.call(owner);
    }
    constructor(self, broadcaster) {
        super(self, { items: [], equipment: createEmptyEquipment() });
        this.broadcaster = broadcaster;
    }
    getEquipment() {
        return this.serialized.get("equipment");
    }
    getItems() {
        return this.serialized.get("items");
    }
    /** Bag slot cap (base + player strength when attached to a Player). */
    getMaxSlots() {
        const owner = this.self;
        if (typeof owner.getMaxInventorySlots === "function") {
            return owner.getMaxInventorySlots();
        }
        return getConfig().player.MAX_INVENTORY_SLOTS;
    }
    isFull() {
        const items = this.serialized.get("items");
        const itemCount = items.filter((item) => item != null).length;
        return itemCount >= this.getMaxSlots();
    }
    hasItem(itemType) {
        var _a;
        const items = this.serialized.get("items");
        if (items.some((it) => (it === null || it === void 0 ? void 0 : it.itemType) === itemType)) {
            return true;
        }
        const eq = this.serialized.get("equipment");
        for (const key of EQUIPMENT_SLOT_KEYS) {
            if (((_a = eq[key]) === null || _a === void 0 ? void 0 : _a.itemType) === itemType) {
                return true;
            }
        }
        return false;
    }
    addItem(item) {
        if (this.isFull())
            return;
        const items = this.serialized.get("items");
        // Find first empty slot (null/undefined) to fill
        const emptySlotIndex = items.findIndex((it) => it == null);
        if (emptySlotIndex !== -1) {
            items[emptySlotIndex] = item;
        }
        else {
            // No empty slots, push to end
            items.push(item);
        }
        // Update serialized (array reference changes, so assign new array to trigger dirty)
        this.serialized.set("items", [...items]);
        // Explicitly mark dirty to ensure inventory changes are broadcast
        this.markDirty();
        this.notifyPlayerWeaponLoadout();
        this.broadcaster.broadcastEvent(new PlayerPickedUpItemEvent({
            playerId: this.self.getId(),
            itemType: item.itemType,
        }));
    }
    /**
     * Sum stack counts in the bag for an item type (non-stackable items count as 1).
     */
    getTotalCount(itemType) {
        var _a, _b;
        const items = this.serialized.get("items");
        let sum = 0;
        for (const it of items) {
            if (!it || it.itemType !== itemType)
                continue;
            sum += (_b = (_a = it.state) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 1;
        }
        return sum;
    }
    /**
     * Merge into an existing stack of the same type, or add a new slot.
     * When the bag is full, still succeeds if an existing stack can absorb the item (same as Carryable).
     */
    addOrMergeStack(item) {
        var _a, _b, _c, _d;
        const items = this.serialized.get("items");
        const addCount = (_b = (_a = item.state) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 1;
        const existingItemIndex = items.findIndex((it) => it != null && it.itemType === item.itemType);
        if (existingItemIndex >= 0) {
            const existing = items[existingItemIndex];
            if (existing) {
                const prev = (_d = (_c = existing.state) === null || _c === void 0 ? void 0 : _c.count) !== null && _d !== void 0 ? _d : 1;
                this.updateItemState(existingItemIndex, { count: prev + addCount });
                this.broadcaster.broadcastEvent(new PlayerPickedUpItemEvent({
                    playerId: this.self.getId(),
                    itemType: item.itemType,
                }));
                return true;
            }
        }
        if (this.isFull()) {
            return false;
        }
        this.addItem(item);
        return true;
    }
    /**
     * Remove a total amount of an item type across bag stacks (e.g. paying with coins).
     * Returns true if at least `amount` was removed.
     */
    removeCountAcrossStacks(itemType, amount) {
        var _a, _b;
        if (amount <= 0) {
            return true;
        }
        const items = this.serialized.get("items");
        let remaining = amount;
        for (let i = 0; i < items.length && remaining > 0; i++) {
            const it = items[i];
            if (!it || it.itemType !== itemType)
                continue;
            const stackCount = (_b = (_a = it.state) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 1;
            if (stackCount <= remaining) {
                remaining -= stackCount;
                items[i] = null;
            }
            else {
                const newCount = stackCount - remaining;
                remaining = 0;
                items[i] = Object.assign(Object.assign({}, it), { state: Object.assign(Object.assign({}, it.state), { count: newCount }) });
            }
        }
        if (remaining > 0) {
            return false;
        }
        this.serialized.set("items", [...items]);
        this.markDirty();
        this.notifyPlayerWeaponLoadout();
        return true;
    }
    removeItem(index) {
        const items = this.serialized.get("items");
        // Don't use splice - just set to null to preserve inventory positions
        const item = items[index];
        if (item != null) {
            items[index] = null;
            // Update serialized (array reference changes, so assign new array to trigger dirty)
            this.serialized.set("items", [...items]);
            // Explicitly mark dirty to ensure inventory changes are broadcast
            this.markDirty();
            this.notifyPlayerWeaponLoadout();
        }
        return item !== null && item !== void 0 ? item : undefined;
    }
    updateItemState(index, state) {
        const items = this.serialized.get("items");
        if (index >= 0 && index < items.length && items[index] != null) {
            items[index].state = state;
            // Update serialized (array reference changes, so assign new array to trigger dirty)
            this.serialized.set("items", [...items]);
            // Explicitly mark dirty to ensure inventory changes are broadcast
            this.markDirty();
            this.notifyPlayerWeaponLoadout();
        }
    }
    mutateSwapBagSlots(fromIndex, toIndex) {
        const maxSlots = this.getMaxSlots();
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= maxSlots || toIndex >= maxSlots) {
            return;
        }
        const items = this.serialized.get("items");
        while (items.length < maxSlots) {
            items.push(null);
        }
        const temp = items[fromIndex];
        items[fromIndex] = items[toIndex];
        items[toIndex] = temp;
        this.serialized.set("items", [...items]);
    }
    swapItems(fromIndex, toIndex) {
        this.mutateSwapBagSlots(fromIndex, toIndex);
        this.markDirty();
        this.notifyPlayerWeaponLoadout();
    }
    /**
     * Swap two bag cells without running weapon-loadout sanitize.
     * Caller must update loadout indices then call player.sanitizeWeaponLoadouts().
     */
    swapBagSlotsDeferWeaponResync(fromIndex, toIndex) {
        this.mutateSwapBagSlots(fromIndex, toIndex);
        this.markDirty();
    }
    /**
     * Swap bag slot with an equipment slot. Validates the item entering equipment.
     */
    swapBagAndEquipment(bagIndex, equipSlot) {
        const maxSlots = this.getMaxSlots();
        if (bagIndex < 0 || bagIndex >= maxSlots) {
            return;
        }
        const items = this.serialized.get("items");
        while (items.length < maxSlots) {
            items.push(null);
        }
        const bagItem = items[bagIndex];
        const equipment = this.serialized.get("equipment");
        const equipItem = equipment[equipSlot];
        if (bagItem != null && !canItemGoInEquipmentSlot(bagItem.itemType, equipSlot)) {
            return;
        }
        items[bagIndex] = equipItem;
        equipment[equipSlot] = bagItem;
        this.serialized.set("items", [...items]);
        this.serialized.set("equipment", Object.assign({}, equipment));
        this.markDirty();
        this.notifyPlayerWeaponLoadout();
    }
    getActiveItem(index) {
        var _a;
        if (index === null)
            return null;
        // Fists / unarmed selection (not a bag slot)
        if (index === FISTS_INVENTORY_SENTINEL)
            return null;
        const items = this.serialized.get("items");
        // TODO: refactor this to be 0 based, why are we subtracting 1?
        return (_a = items[index - 1]) !== null && _a !== void 0 ? _a : null;
    }
    getActiveWeapon(activeItem) {
        if (!activeItem)
            return null;
        return isWeapon(activeItem.itemType) ? activeItem : null;
    }
    /** Weapon in the active bag slot (no separate weapon equipment slot). */
    resolveActiveWeapon(activeBagItem) {
        return this.getActiveWeapon(activeBagItem);
    }
    craftRecipe(recipe) {
        const items = this.serialized.get("items");
        const foundRecipe = recipes.find((it) => it.getType() === recipe);
        if (foundRecipe === undefined) {
            return { inventory: items };
        }
        const maxSlots = this.getMaxSlots();
        const result = foundRecipe.craft(items, maxSlots);
        this.serialized.set("items", result.inventory);
        // Explicitly mark dirty to ensure inventory changes are broadcast
        this.markDirty();
        this.notifyPlayerWeaponLoadout();
        return result;
    }
    addRandomItem(chance = 1, dropTable = LEGACY_RANDOM_DROP_TABLE) {
        if (Math.random() < chance) {
            const itemType = this.getWeightedRandomItem(dropTable);
            this.addItem({ itemType });
        }
        return this;
    }
    /**
     * Selects a random item from the drop table based on weighted probabilities.
     * Items with higher weights have a higher chance of being selected.
     */
    getWeightedRandomItem(dropTable) {
        const totalWeight = dropTable.reduce((sum, entry) => sum + entry.weight, 0);
        let random = Math.random() * totalWeight;
        for (const entry of dropTable) {
            random -= entry.weight;
            if (random <= 0) {
                return entry.itemType;
            }
        }
        return dropTable[0].itemType;
    }
    clear() {
        const items = this.serialized.get("items");
        const hadItems = items.length > 0;
        const eq = this.serialized.get("equipment");
        const hadEquip = EQUIPMENT_SLOT_KEYS.some((k) => eq[k] != null);
        if (hadItems) {
            this.serialized.set("items", []);
        }
        if (hadEquip) {
            this.serialized.set("equipment", createEmptyEquipment());
        }
        if (hadItems || hadEquip) {
            this.markDirty();
            this.notifyPlayerWeaponLoadout();
        }
    }
    scatterItems(position) {
        const scatterOne = (item) => {
            var _a;
            if (item == null)
                return;
            const entity = this.createEntityFromItem(item);
            if (!entity)
                return;
            const offset = 32;
            const theta = Math.random() * 2 * Math.PI;
            const radius = Math.random() * offset;
            const poolManager = PoolManager.getInstance();
            const pos = poolManager.vector2.claim(position.x + radius * Math.cos(theta), position.y + radius * Math.sin(theta));
            if ("setPosition" in entity) {
                entity.setPosition(pos);
            }
            else if (entity.hasExt(Positionable)) {
                entity.getExt(Positionable).setPosition(pos);
            }
            (_a = this.self.getEntityManager()) === null || _a === void 0 ? void 0 : _a.addEntity(entity);
        };
        const items = this.serialized.get("items");
        items.forEach((item) => scatterOne(item));
        const equipment = this.serialized.get("equipment");
        for (const key of EQUIPMENT_SLOT_KEYS) {
            scatterOne(equipment[key]);
        }
        this.serialized.set("items", []);
        this.serialized.set("equipment", createEmptyEquipment());
        this.markDirty();
        this.notifyPlayerWeaponLoadout();
    }
    createEntityFromItem(item) {
        return this.self.getEntityManager().createEntityFromItem(item);
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Inventory.type));
        writer.writeArray(this.serialized.get("items"), (item) => {
            if (item === null || item === undefined) {
                writer.writeBoolean(false);
            }
            else {
                writer.writeBoolean(true);
                writer.writeUInt8(itemTypeRegistry.encode(item.itemType));
                writeItemState(writer, item.state);
            }
        });
        const equipment = this.serialized.get("equipment");
        const writeSlot = (item) => {
            if (item === null || item === undefined) {
                writer.writeBoolean(false);
            }
            else {
                writer.writeBoolean(true);
                writer.writeUInt8(itemTypeRegistry.encode(item.itemType));
                writeItemState(writer, item.state);
            }
        };
        for (const key of EQUIPMENT_SLOT_KEYS) {
            writeSlot(equipment[key]);
        }
    }
}
Inventory.type = "inventory";
export default Inventory;
