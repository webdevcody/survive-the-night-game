import { PlayerPickedUpItemEvent } from "../../../game-shared/src/events/server-sent/events/pickup-item-event";
import Inventory from "@/extensions/inventory";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { itemTypeRegistry } from "@shared/util/item-type-encoding";
import { writeItemState } from "@shared/util/item-state-serialization";
import { ExtensionBase } from "./extension-base";
import { Player } from "@/entities/players/player";
import { advancePickupStep } from "@/quests/quest-runtime";
class Carryable extends ExtensionBase {
    constructor(self, itemType) {
        super(self, { itemType, state: {} });
    }
    setItemState(state) {
        this.serialized.set("state", state);
        return this;
    }
    getItemState() {
        return this.serialized.get("state");
    }
    getItemType() {
        return this.serialized.get("itemType");
    }
    /**
     * Creates pickup options for stackable items that preserve count when dropped and picked up.
     * This ensures that when a stacked item is dropped and picked back up, it maintains its count.
     */
    static createStackablePickupOptions(carryable, defaultCount) {
        var _a;
        const currentCount = (_a = carryable.getItemState().count) !== null && _a !== void 0 ? _a : defaultCount;
        return {
            state: { count: currentCount },
            mergeStrategy: (existing, pickup) => ({
                count: ((existing === null || existing === void 0 ? void 0 : existing.count) || 0) + ((pickup === null || pickup === void 0 ? void 0 : pickup.count) || defaultCount),
            }),
        };
    }
    pickup(entityId, options) {
        var _a, _b, _c;
        const itemType = this.serialized.get("itemType");
        // Prevent crash if itemType is null (entity may be in invalid state)
        if (!itemType) {
            console.warn("Attempted to pickup item with null itemType");
            return false;
        }
        const entity = this.self.getEntityManager().getEntityById(entityId);
        if (!entity) {
            return false;
        }
        const inventory = entity.getExt(Inventory);
        if (inventory.isFull() && !(options === null || options === void 0 ? void 0 : options.mergeStrategy)) {
            return false;
        }
        // If we have a merge strategy and existing item, merge instead of adding new
        if (options === null || options === void 0 ? void 0 : options.mergeStrategy) {
            const existingItemIndex = inventory
                .getItems()
                .findIndex((item) => item != null && item.itemType === itemType);
            if (existingItemIndex >= 0) {
                const existingItem = inventory.getItems()[existingItemIndex];
                if (existingItem) {
                    const newState = options.mergeStrategy((_a = existingItem.state) !== null && _a !== void 0 ? _a : {}, (_b = options.state) !== null && _b !== void 0 ? _b : {});
                    inventory.updateItemState(existingItemIndex, newState);
                    this.self.getEntityManager().markEntityForRemoval(this.self);
                    if (entity instanceof Player) {
                        advancePickupStep(entity, itemType, entity.getGameManagers().getMapManager());
                    }
                    return true;
                }
            }
        }
        // Otherwise add as new item
        if (inventory.isFull()) {
            return false;
        }
        const pickupState = (_c = options === null || options === void 0 ? void 0 : options.state) !== null && _c !== void 0 ? _c : this.getItemState();
        inventory.addItem({
            itemType: itemType,
            state: pickupState,
        });
        this.self.getEntityManager().markEntityForRemoval(this.self);
        this.self
            .getEntityManager()
            .getBroadcaster()
            .broadcastEvent(new PlayerPickedUpItemEvent({
            playerId: entityId,
            itemType: itemType,
        }));
        if (entity instanceof Player) {
            advancePickupStep(entity, itemType, entity.getGameManagers().getMapManager());
        }
        return true;
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Carryable.type));
        writer.writeUInt8(itemTypeRegistry.encode(this.serialized.get("itemType")));
        writeItemState(writer, this.serialized.get("state"));
    }
}
Carryable.type = "carryable";
export default Carryable;
