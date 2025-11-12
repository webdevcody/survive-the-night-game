import { Extension, ExtensionSerialized } from "@/extensions/types";
import { InventoryItem, ITEM_TYPES, ItemType } from "../../../game-shared/src/util/inventory";
import { recipes, RecipeType } from "../../../game-shared/src/util/recipes";
import { Broadcaster } from "@/managers/types";
import { PlayerPickedUpItemEvent } from "@shared/events/server-sent/pickup-item-event";
import Positionable from "@/extensions/positionable";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { WEAPON_TYPE_VALUES } from "@shared/types/weapons";
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

  // Uncommon items (medium weight)
  { itemType: "pistol", weight: 8 },
  { itemType: "shotgun", weight: 6 },
  { itemType: "knife", weight: 8 },
  { itemType: "wall", weight: 8 },
  { itemType: "torch", weight: 10 },
  { itemType: "miners_hat", weight: 8 },
  { itemType: "spikes", weight: 7 },
  { itemType: "grenade", weight: 5 },
  { itemType: "fire_extinguisher", weight: 5 },

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
    return this.items.some((it) => it?.itemType === itemType);
  }

  public addItem(item: InventoryItem): void {
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
    const activeItemType = activeItem?.itemType ?? "";
    return WEAPON_TYPE_VALUES.includes(activeItemType as any) ? activeItem : null;
  }

  public craftRecipe(recipe: RecipeType, resources: { wood: number; cloth: number }): {
    inventory: InventoryItem[];
    resources: { wood: number; cloth: number };
    itemToDrop?: InventoryItem;
  } {
    const foundRecipe = recipes.find((it) => it.getType() === recipe);
    if (foundRecipe === undefined) {
      return { inventory: this.items, resources };
    }

    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    const result = foundRecipe.craft(this.items, resources, maxSlots);
    const itemsChanged = JSON.stringify(this.items) !== JSON.stringify(result.inventory);
    this.items = result.inventory;
    if (itemsChanged) {
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
      this.markDirty();
    }
  }

  public scatterItems(position: { x: number; y: number }): void {
    const offset = 32;
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
    };
  }
}
