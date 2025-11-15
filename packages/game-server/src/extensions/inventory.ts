import { Extension, ExtensionSerialized } from "@/extensions/types";
import { InventoryItem, ItemType, isWeapon, isAmmo } from "@shared/util/inventory";
import { recipes, RecipeType } from "../../../game-shared/src/util/recipes";
import { Broadcaster } from "@/managers/types";
import { PlayerPickedUpItemEvent } from "@shared/events/server-sent/pickup-item-event";
import Positionable from "@/extensions/positionable";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { getConfig } from "@/config";

/**
 * Item drop table with weighted chances.
 * Higher weight = higher chance of dropping.
 */
const ITEM_DROP_TABLE: Array<{ itemType: ItemType; weight: number }> = [
  // Common items (high weight)
  { itemType: "wood", weight: 25 },
  { itemType: "cloth", weight: 25 },
  { itemType: "bandage", weight: 15 },
  { itemType: "pistol_ammo", weight: 12 },
  { itemType: "shotgun_ammo", weight: 12 },
  { itemType: "arrow_ammo", weight: 12 },

  // Uncommon items (medium weight)
  { itemType: "pistol", weight: 8 },
  { itemType: "shotgun", weight: 6 },
  { itemType: "knife", weight: 8 },
  { itemType: "wall", weight: 8 },
  { itemType: "torch", weight: 10 },
  { itemType: "miners_hat", weight: 8 },
  { itemType: "spikes", weight: 7 },
  { itemType: "grenade", weight: 5 },

  // Rare items (low weight)
  { itemType: "bolt_action_rifle", weight: 3 },
  { itemType: "ak47", weight: 2 },
  { itemType: "grenade_launcher", weight: 1.5 },
  { itemType: "flamethrower", weight: 1.5 },
  { itemType: "bolt_action_ammo", weight: 4 },
  { itemType: "ak47_ammo", weight: 4 },
  { itemType: "grenade_launcher_ammo", weight: 3 },
  { itemType: "flamethrower_ammo", weight: 3 },
  { itemType: "landmine", weight: 4 },
  { itemType: "sentry_gun", weight: 2 },
  { itemType: "gasoline", weight: 6 },
  { itemType: "coin", weight: 10 },
];

export default class Inventory implements Extension {
  public static readonly type = "inventory";

  private self: IEntity;
  private items: InventoryItem[] = [];
  // Separate ammo storage: { ammoType: count }
  private ammo: Record<string, number> = {};
  private broadcaster: Broadcaster;
  private dirty: boolean = false;

  public constructor(self: IEntity, broadcaster: Broadcaster) {
    this.self = self;
    this.broadcaster = broadcaster;
  }

  public getItems(): InventoryItem[] {
    return this.items;
  }

  public isFull(): boolean {
    // Count non-null items instead of array length to support sparse arrays
    const itemCount = this.items.filter((item) => item != null).length;
    return itemCount >= getConfig().player.MAX_INVENTORY_SLOTS;
  }

  public hasItem(itemType: ItemType): boolean {
    // Check regular inventory
    if (this.items.some((it) => it?.itemType === itemType)) {
      return true;
    }
    // Check ammo storage
    if (isAmmo(itemType)) {
      return this.hasAmmo(itemType);
    }
    return false;
  }

  public addItem(item: InventoryItem): void {
    // Check if item is ammo - if so, add to separate ammo storage
    if (isAmmo(item.itemType)) {
      this.addAmmo(item.itemType, item.state?.count || 1);

      this.broadcaster.broadcastEvent(
        new PlayerPickedUpItemEvent({
          playerId: this.self.getId(),
          itemType: item.itemType,
        })
      );
      return;
    }

    if (this.isFull()) return;

    // Find first empty slot (null/undefined) to fill
    const emptySlotIndex = this.items.findIndex((it) => it == null);
    if (emptySlotIndex !== -1) {
      this.items[emptySlotIndex] = item;
    } else {
      // No empty slots, push to end
      this.items.push(item);
    }

    this.markDirty();

    this.broadcaster.broadcastEvent(
      new PlayerPickedUpItemEvent({
        playerId: this.self.getId(),
        itemType: item.itemType,
      })
    );
  }

  public removeItem(index: number): InventoryItem | undefined {
    // Don't use splice - just set to null to preserve inventory positions
    const item = this.items[index];
    if (item != null) {
      this.items[index] = null as any;
      this.markDirty();
    }
    return item;
  }

  public updateItemState(index: number, state: any): void {
    if (index >= 0 && index < this.items.length && this.items[index] != null) {
      this.items[index].state = state;
      this.markDirty();
    }
  }

  public getActiveItem(index: number | null): InventoryItem | null {
    if (index === null) return null;
    // TODO: refactor this to be 0 based, why are we subtracting 1?
    return this.items[index - 1] ?? null;
  }

  public getActiveWeapon(activeItem: InventoryItem | null): InventoryItem | null {
    if (!activeItem) return null;
    return isWeapon(activeItem.itemType) ? activeItem : null;
  }

  public craftRecipe(
    recipe: RecipeType,
    resources: { wood: number; cloth: number }
  ): {
    inventory: InventoryItem[];
    resources: { wood: number; cloth: number };
    itemToDrop?: InventoryItem;
  } {
    const foundRecipe = recipes.find((it) => it.getType() === recipe);
    if (!foundRecipe) {
      return { inventory: this.items, resources };
    }

    // --- Create combined inventory (items + ammo) ---
    // Pre-allocate final size to minimize resizing
    const combinedInventory = this.items.slice(); // cheap shallow copy

    for (const ammoType in this.ammo) {
      const count = this.ammo[ammoType];
      if (count > 0) {
        combinedInventory.push({
          itemType: ammoType as ItemType,
          state: { count },
        });
      }
    }

    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    const result = foundRecipe.craft(combinedInventory, resources, maxSlots);

    // --- Split output back into items + ammo ---
    const newItems: InventoryItem[] = [];
    const newAmmo: Record<string, number> = {};

    for (let i = 0; i < result.inventory.length; i++) {
      const item = result.inventory[i];
      if (!item) continue;

      if (isAmmo(item.itemType)) {
        newAmmo[item.itemType] = item.state?.count || 0;
      } else {
        newItems.push(item);
      }
    }

    // --- Detect changes in O(n) WITHOUT JSON.stringify ---
    let changed = false;

    // Items changed?
    if (newItems.length !== this.items.length) {
      changed = true;
    } else {
      for (let i = 0; i < newItems.length; i++) {
        const a = newItems[i];
        const b = this.items[i];
        if (a.itemType !== b.itemType) {
          changed = true;
          break;
        }
        if ((a.state?.count ?? 0) !== (b.state?.count ?? 0)) {
          changed = true;
          break;
        }
      }
    }

    // Ammo changed?
    if (!changed) {
      for (const key in newAmmo) {
        if (newAmmo[key] !== this.ammo[key]) {
          changed = true;
          break;
        }
      }
      for (const key in this.ammo) {
        if (this.ammo[key] !== newAmmo[key]) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      this.items = newItems;
      this.ammo = newAmmo;
      this.markDirty();
    }

    return result;
  }

  public addRandomItem(chance = 1): this {
    if (Math.random() < chance) {
      const itemType = this.getWeightedRandomItem();
      this.addItem({ itemType });
    }
    return this;
  }

  /**
   * Selects a random item from the drop table based on weighted probabilities.
   * Items with higher weights have a higher chance of being selected.
   */
  private getWeightedRandomItem(): ItemType {
    // Calculate total weight
    const totalWeight = ITEM_DROP_TABLE.reduce((sum, entry) => sum + entry.weight, 0);

    // Generate random number between 0 and total weight
    let random = Math.random() * totalWeight;

    // Find the item that corresponds to this random value
    for (const entry of ITEM_DROP_TABLE) {
      random -= entry.weight;
      if (random <= 0) {
        return entry.itemType;
      }
    }

    // Fallback (should never reach here)
    return ITEM_DROP_TABLE[0].itemType;
  }

  public clear(): void {
    if (this.items.length > 0) {
      this.items = [];
      this.ammo = {};
      this.markDirty();
    }
  }

  // Ammo management methods
  public addAmmo(ammoType: string, count: number): void {
    if (!this.ammo[ammoType]) {
      this.ammo[ammoType] = 0;
    }
    this.ammo[ammoType] += count;
    this.markDirty();
  }

  public getAmmo(ammoType: string): number {
    return this.ammo[ammoType] || 0;
  }

  public hasAmmo(ammoType: string): boolean {
    return this.getAmmo(ammoType) > 0;
  }

  public consumeAmmo(ammoType: string, count: number = 1): boolean {
    const currentCount = this.getAmmo(ammoType);
    if (currentCount < count) {
      return false;
    }
    this.ammo[ammoType] = currentCount - count;
    if (this.ammo[ammoType] <= 0) {
      delete this.ammo[ammoType];
    }
    this.markDirty();
    return true;
  }

  public getAllAmmo(): Record<string, number> {
    return { ...this.ammo };
  }

  public scatterItems(position: { x: number; y: number }): void {
    const offset = 32;

    // Scatter regular inventory items
    this.items.forEach((item) => {
      if (item == null) return; // Skip null/undefined items
      const entity = this.createEntityFromItem(item);
      if (!entity) return;
      const theta = Math.random() * 2 * Math.PI;
      const radius = Math.random() * offset;
      const pos = new Vector2(
        position.x + radius * Math.cos(theta),
        position.y + radius * Math.sin(theta)
      );

      if ("setPosition" in entity) {
        (entity as any).setPosition(pos);
      } else if (entity.hasExt(Positionable)) {
        entity.getExt(Positionable).setPosition(pos);
      }

      this.self.getEntityManager()?.addEntity(entity);
    });
    this.items = [];

    // Scatter ammo items
    Object.entries(this.ammo).forEach(([ammoType, count]) => {
      if (count <= 0) return;
      const entity = this.createEntityFromItem({
        itemType: ammoType as ItemType,
        state: { count },
      });
      if (!entity) return;
      const theta = Math.random() * 2 * Math.PI;
      const radius = Math.random() * offset;
      const pos = new Vector2(
        position.x + radius * Math.cos(theta),
        position.y + radius * Math.sin(theta)
      );

      if ("setPosition" in entity) {
        (entity as any).setPosition(pos);
      } else if (entity.hasExt(Positionable)) {
        entity.getExt(Positionable).setPosition(pos);
      }

      this.self.getEntityManager()?.addEntity(entity);
    });
    this.ammo = {};
  }

  private createEntityFromItem(item: InventoryItem) {
    return this.self.getEntityManager()!.createEntityFromItem(item);
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  public markDirty(): void {
    this.dirty = true;
    if (this.self.markExtensionDirty) {
      this.self.markExtensionDirty(this);
    }
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public serializeDirty(): ExtensionSerialized | null {
    if (!this.dirty) {
      return null;
    }
    return this.serialize();
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Inventory.type,
      items: this.items,
      ammo: this.ammo,
    };
  }
}
