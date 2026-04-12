import { getConfig } from "@/config";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { itemTypeRegistry } from "@shared/util/item-type-encoding";
import { writeItemState } from "@shared/util/item-state-serialization";
import { ExtensionBase } from "./extension-base";
import { coercePlayerBankPersistedPayload, } from "@shared/util/persisted-bank-payload";
class Bank extends ExtensionBase {
    constructor(self) {
        const max = getConfig().player.MAX_BANK_SLOTS;
        super(self, { items: new Array(max).fill(null) });
    }
    getMaxSlots() {
        return getConfig().player.MAX_BANK_SLOTS;
    }
    getItems() {
        return this.serialized.get("items");
    }
    isFull() {
        const items = this.serialized.get("items");
        const itemCount = items.filter((item) => item != null).length;
        return itemCount >= this.getMaxSlots();
    }
    addItem(item) {
        if (this.isFull())
            return;
        const items = this.serialized.get("items");
        const emptySlotIndex = items.findIndex((it) => it == null);
        if (emptySlotIndex !== -1) {
            items[emptySlotIndex] = item;
        }
        else {
            items.push(item);
        }
        this.serialized.set("items", [...items]);
        this.markDirty();
    }
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
                return true;
            }
        }
        if (this.isFull()) {
            return false;
        }
        this.addItem(item);
        return true;
    }
    setBankSlot(index, item) {
        const items = this.serialized.get("items");
        if (index < 0 || index >= items.length) {
            return;
        }
        items[index] = item;
        this.serialized.set("items", [...items]);
        this.markDirty();
    }
    removeItem(index) {
        const items = this.serialized.get("items");
        const item = items[index];
        if (item != null) {
            items[index] = null;
            this.serialized.set("items", [...items]);
            this.markDirty();
        }
        return item !== null && item !== void 0 ? item : undefined;
    }
    updateItemState(index, state) {
        const items = this.serialized.get("items");
        if (index >= 0 && index < items.length && items[index] != null) {
            const item = items[index];
            items[index] = Object.assign(Object.assign({}, item), { state: Object.assign(Object.assign({}, item.state), state) });
            this.serialized.set("items", [...items]);
            this.markDirty();
        }
    }
    hasItem(itemType) {
        return this.serialized.get("items").some((it) => (it === null || it === void 0 ? void 0 : it.itemType) === itemType);
    }
    toPersistedPayload() {
        return {
            items: structuredClone(this.serialized.get("items")),
        };
    }
    applyPersistedPayload(payload) {
        var _a;
        const coerced = coercePlayerBankPersistedPayload(payload);
        if (!coerced) {
            return;
        }
        const max = this.getMaxSlots();
        const next = [];
        for (let i = 0; i < max; i++) {
            next.push((_a = coerced.items[i]) !== null && _a !== void 0 ? _a : null);
        }
        this.serialized.set("items", next);
        this.markDirty();
    }
    clear() {
        const max = this.getMaxSlots();
        this.serialized.set("items", new Array(max).fill(null));
        this.markDirty();
    }
    serializeToBuffer(writer, onlyDirty = false) {
        writer.writeUInt8(encodeExtensionType(Bank.type));
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
    }
}
Bank.type = "bank";
export default Bank;
