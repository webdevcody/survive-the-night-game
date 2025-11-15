import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { InventoryItem, isWeapon, ItemType } from "../../../game-shared/src/util/inventory";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";

export class ClientInventory extends BaseClientExtension {
  public static readonly type = ExtensionTypes.INVENTORY;
  public static readonly MAX_SLOTS = 8;

  private items: InventoryItem[] = [];
  // Separate ammo storage: { ammoType: count }
  private ammo: Record<string, number> = {};

  public getItems(): InventoryItem[] {
    return this.items;
  }

  public isFull(): boolean {
    return this.items.length >= ClientInventory.MAX_SLOTS;
  }

  public getActiveItem(index: number | null): InventoryItem | null {
    if (index === null) return null;
    return this.items[index - 1] ?? null;
  }

  public getActiveWeapon(activeItem: InventoryItem | null): InventoryItem | null {
    if (!activeItem) return null;
    return isWeapon(activeItem.itemType) ? activeItem : null;
  }

  // Ammo management methods
  public getAmmo(ammoType: string): number {
    return this.ammo[ammoType] || 0;
  }

  public hasAmmo(ammoType: string): boolean {
    return this.getAmmo(ammoType) > 0;
  }

  public getAllAmmo(): Record<string, number> {
    return { ...this.ammo };
  }

  public deserialize(data: ClientExtensionSerialized): this {
    if (data.items) {
      this.items = data.items;
    }
    if (data.ammo) {
      this.ammo = data.ammo;
    }
    return this;
  }
}
