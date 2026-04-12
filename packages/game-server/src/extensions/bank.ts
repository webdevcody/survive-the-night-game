import { Extension } from "@/extensions/types";
import type { InventoryItem, ItemType } from "@shared/util/inventory";
import { getConfig } from "@/config";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { itemTypeRegistry } from "@shared/util/item-type-encoding";
import { writeItemState } from "@shared/util/item-state-serialization";
import { ExtensionBase } from "./extension-base";
import { IEntity } from "@/entities/types";
import {
  coercePlayerBankPersistedPayload,
  type PlayerBankPersistedPayload,
} from "@shared/util/persisted-bank-payload";

type BankFields = {
  items: (InventoryItem | null)[];
};

export default class Bank extends ExtensionBase<BankFields> implements Extension {
  public static readonly type = "bank";

  public constructor(self: IEntity) {
    const max = getConfig().player.MAX_BANK_SLOTS;
    super(self, { items: new Array(max).fill(null) });
  }

  public getMaxSlots(): number {
    return getConfig().player.MAX_BANK_SLOTS;
  }

  public getItems(): (InventoryItem | null)[] {
    return this.serialized.get("items");
  }

  public isFull(): boolean {
    const items = this.serialized.get("items");
    const itemCount = items.filter((item: InventoryItem | null) => item != null).length;
    return itemCount >= this.getMaxSlots();
  }

  public addItem(item: InventoryItem): void {
    if (this.isFull()) return;
    const items = this.serialized.get("items");
    const emptySlotIndex = items.findIndex((it: InventoryItem | null) => it == null);
    if (emptySlotIndex !== -1) {
      items[emptySlotIndex] = item;
    } else {
      items.push(item);
    }
    this.serialized.set("items", [...items]);
    this.markDirty();
  }

  public addOrMergeStack(item: InventoryItem): boolean {
    const items = this.serialized.get("items");
    const addCount = item.state?.count ?? 1;

    const existingItemIndex = items.findIndex(
      (it: InventoryItem | null) => it != null && it.itemType === item.itemType,
    );

    if (existingItemIndex >= 0) {
      const existing = items[existingItemIndex];
      if (existing) {
        const prev = existing.state?.count ?? 1;
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

  public setBankSlot(index: number, item: InventoryItem | null): void {
    const items = this.serialized.get("items");
    if (index < 0 || index >= items.length) {
      return;
    }
    items[index] = item;
    this.serialized.set("items", [...items]);
    this.markDirty();
  }

  public removeItem(index: number): InventoryItem | undefined {
    const items = this.serialized.get("items");
    const item = items[index];
    if (item != null) {
      items[index] = null;
      this.serialized.set("items", [...items]);
      this.markDirty();
    }
    return item ?? undefined;
  }

  public updateItemState(index: number, state: any): void {
    const items = this.serialized.get("items");
    if (index >= 0 && index < items.length && items[index] != null) {
      const item = items[index]!;
      items[index] = {
        ...item,
        state: { ...item.state, ...state },
      };
      this.serialized.set("items", [...items]);
      this.markDirty();
    }
  }

  public hasItem(itemType: ItemType): boolean {
    return this.serialized.get("items").some((it: InventoryItem | null) => it?.itemType === itemType);
  }

  public toPersistedPayload(): PlayerBankPersistedPayload {
    return {
      items: structuredClone(this.serialized.get("items")) as (InventoryItem | null)[],
    };
  }

  public applyPersistedPayload(payload: PlayerBankPersistedPayload): void {
    const coerced = coercePlayerBankPersistedPayload(payload);
    if (!coerced) {
      return;
    }
    const max = this.getMaxSlots();
    const next: (InventoryItem | null)[] = [];
    for (let i = 0; i < max; i++) {
      next.push(coerced.items[i] ?? null);
    }
    this.serialized.set("items", next);
    this.markDirty();
  }

  public clear(): void {
    const max = this.getMaxSlots();
    this.serialized.set("items", new Array(max).fill(null));
    this.markDirty();
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Bank.type));
    writer.writeArray(this.serialized.get("items"), (item: InventoryItem | null) => {
      if (item === null || item === undefined) {
        writer.writeBoolean(false);
      } else {
        writer.writeBoolean(true);
        writer.writeUInt8(itemTypeRegistry.encode(item.itemType));
        writeItemState(writer, item.state);
      }
    });
  }
}
