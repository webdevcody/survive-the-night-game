import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import {
  InventoryItem,
  ItemType,
  isWeapon,
  createEmptyEquipment,
  EQUIPMENT_SLOT_KEYS,
  type PlayerEquipmentState,
} from "../../../game-shared/src/util/inventory";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";
import { FISTS_INVENTORY_SENTINEL } from "@shared/constants/inventory-sentinel";
import { playerConfig } from "@shared/config";
import { itemTypeRegistry } from "@shared/util/item-type-encoding";
import { readItemState } from "@shared/util/item-state-serialization";

export class ClientInventory extends BaseClientExtension {
  public static readonly type = ExtensionTypes.INVENTORY;

  private items: (InventoryItem | null)[] = [];
  private equipment: PlayerEquipmentState = createEmptyEquipment();

  public getItems(): (InventoryItem | null)[] {
    return this.items;
  }

  public getEquipment(): PlayerEquipmentState {
    return this.equipment;
  }

  public getMaxSlots(): number {
    const e = this.clientEntity as { getMaxInventorySlots?: () => number };
    if (typeof e.getMaxInventorySlots === "function") {
      return e.getMaxInventorySlots();
    }
    return playerConfig.MAX_INVENTORY_SLOTS;
  }

  public isFull(): boolean {
    const itemCount = this.items.filter((item: InventoryItem | null) => item != null).length;
    return itemCount >= this.getMaxSlots();
  }

  public getActiveItem(index: number | null): InventoryItem | null {
    if (index === null) return null;
    if (index === FISTS_INVENTORY_SENTINEL) return null;
    return this.items[index - 1] ?? null;
  }

  public getActiveWeapon(activeItem: InventoryItem | null): InventoryItem | null {
    if (!activeItem) return null;
    return isWeapon(activeItem.itemType) ? activeItem : null;
  }

  public resolveActiveWeapon(activeBagItem: InventoryItem | null): InventoryItem | null {
    return this.getActiveWeapon(activeBagItem);
  }

  /** Sum stack counts in the bag for an item type (non-stackable counts as 1). */
  public getTotalCount(itemType: ItemType): number {
    let sum = 0;
    for (const it of this.items) {
      if (!it || it.itemType !== itemType) continue;
      sum += it.state?.count ?? 1;
    }
    return sum;
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

    const readNullableItem = (): InventoryItem | null => {
      if (!reader.readBoolean()) {
        return null;
      }
      const itemType = itemTypeRegistry.decode(reader.readUInt8());
      const state = readItemState(reader);
      return { itemType, state };
    };

    if (reader.hasMore()) {
      const eq = createEmptyEquipment();
      for (const key of EQUIPMENT_SLOT_KEYS) {
        eq[key] = readNullableItem();
      }
      this.equipment = eq;
    } else {
      this.equipment = createEmptyEquipment();
    }

    return this;
  }
}
