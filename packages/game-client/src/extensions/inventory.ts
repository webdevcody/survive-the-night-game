import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { InventoryItem, isWeapon, ItemType } from "../../../game-shared/src/util/inventory";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";
import { playerConfig } from "@shared/config";

export class ClientInventory extends BaseClientExtension {
  public static readonly type = ExtensionTypes.INVENTORY;

  private items: InventoryItem[] = [];

  public getItems(): InventoryItem[] {
    return this.items;
  }

  public isFull(): boolean {
    // Count non-null items instead of array length to support sparse arrays
    const itemCount = this.items.filter((item: InventoryItem | null) => item != null).length;
    return itemCount >= playerConfig.MAX_INVENTORY_SLOTS;
  }

  public getActiveItem(index: number | null): InventoryItem | null {
    if (index === null) return null;
    return this.items[index - 1] ?? null;
  }

  public getActiveWeapon(activeItem: InventoryItem | null): InventoryItem | null {
    if (!activeItem) return null;
    return isWeapon(activeItem.itemType) ? activeItem : null;
  }

  public deserialize(data: ClientExtensionSerialized): this {
    if (data.items) {
      this.items = data.items;
    }
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Read items array
    this.items = reader.readArray(() => {
      if (!reader.readBoolean()) {
        return null as any;
      }
      const itemType = reader.readString();
      // Read ItemState record (values are numbers)
      const state = reader.readRecord(() => reader.readFloat64());
      return { itemType, state };
    });
    return this;
  }
}
