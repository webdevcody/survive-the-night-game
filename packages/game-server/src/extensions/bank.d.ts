import { Extension } from "@/extensions/types";
import type { InventoryItem, ItemType } from "@shared/util/inventory";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { ExtensionBase } from "./extension-base";
import { IEntity } from "@/entities/types";
import { type PlayerBankPersistedPayload } from "@shared/util/persisted-bank-payload";
type BankFields = {
    items: (InventoryItem | null)[];
};
export default class Bank extends ExtensionBase<BankFields> implements Extension {
    static readonly type = "bank";
    constructor(self: IEntity);
    getMaxSlots(): number;
    getItems(): (InventoryItem | null)[];
    isFull(): boolean;
    addItem(item: InventoryItem): void;
    addOrMergeStack(item: InventoryItem): boolean;
    setBankSlot(index: number, item: InventoryItem | null): void;
    removeItem(index: number): InventoryItem | undefined;
    updateItemState(index: number, state: any): void;
    hasItem(itemType: ItemType): boolean;
    toPersistedPayload(): PlayerBankPersistedPayload;
    applyPersistedPayload(payload: PlayerBankPersistedPayload): void;
    clear(): void;
    serializeToBuffer(writer: BufferWriter, onlyDirty?: boolean): void;
}
export {};
