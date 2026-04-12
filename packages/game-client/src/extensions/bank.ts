import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { InventoryItem, ItemType } from "../../../game-shared/src/util/inventory";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";
import { playerConfig } from "@shared/config/player-config";
import { itemTypeRegistry } from "@shared/util/item-type-encoding";
import { readItemState } from "@shared/util/item-state-serialization";

export class ClientBank extends BaseClientExtension {
  public static readonly type = ExtensionTypes.BANK;

  private items: (InventoryItem | null)[] = [];

  public getItems(): (InventoryItem | null)[] {
    return this.items;
  }

  public getMaxSlots(): number {
    return playerConfig.MAX_BANK_SLOTS;
  }

  public isFull(): boolean {
    const itemCount = this.items.filter((item: InventoryItem | null) => item != null).length;
    return itemCount >= this.getMaxSlots();
  }

  public hasItem(itemType: ItemType): boolean {
    return this.items.some((it: InventoryItem | null) => it?.itemType === itemType);
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    this.items = reader.readArray(() => {
      if (!reader.readBoolean()) {
        return null as any;
      }
      const itemType = itemTypeRegistry.decode(reader.readUInt8());
      const state = readItemState(reader);
      return { itemType, state };
    });
    return this;
  }
}
