import { Extension } from "@/extensions/types";
import { InventoryItem, ItemType, isWeapon } from "../../../game-shared/src/util/inventory";
import { recipes, RecipeType } from "../../../game-shared/src/util/recipes";
import { Broadcaster } from "@/managers/types";
import { PlayerPickedUpItemEvent } from "../../../game-shared/src/events/server-sent/events/pickup-item-event";
import Positionable from "@/extensions/positionable";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { getConfig } from "@/config";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";

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

import { ExtensionBase } from "./extension-base";

export default class Inventory extends ExtensionBase {
  public static readonly type = "inventory";

  private broadcaster: Broadcaster;

  public constructor(self: IEntity, broadcaster: Broadcaster) {
    super(self, { items: [] });
    this.broadcaster = broadcaster;
  }

  public getItems(): InventoryItem[] {
    return this.serialized.get('items');
  }

  public isFull(): boolean {
    const items = this.serialized.get('items');
    // Count non-null items instead of array length to support sparse arrays
    const itemCount = items.filter((item: InventoryItem | null) => item != null).length;
    return itemCount >= getConfig().player.MAX_INVENTORY_SLOTS;
  }

  public hasItem(itemType: ItemType): boolean {
    const items = this.serialized.get('items');
    return items.some((it: InventoryItem | null) => it?.itemType === itemType);
  }

  public addItem(item: InventoryItem): void {
    if (this.isFull()) return;

    const items = this.serialized.get('items');

    // Find first empty slot (null/undefined) to fill
    const emptySlotIndex = items.findIndex((it: InventoryItem | null) => it == null);
    if (emptySlotIndex !== -1) {
      items[emptySlotIndex] = item;
    } else {
      // No empty slots, push to end
      items.push(item);
    }

    // Update serialized (array reference changes, so assign new array to trigger dirty)
    this.serialized.set('items', [...items]);
    // Explicitly mark dirty to ensure inventory changes are broadcast
    this.markDirty();

    this.broadcaster.broadcastEvent(
      new PlayerPickedUpItemEvent({
        playerId: this.self.getId(),
        itemType: item.itemType,
      })
    );
  }

  public removeItem(index: number): InventoryItem | undefined {
    const items = this.serialized.get('items');
    // Don't use splice - just set to null to preserve inventory positions
    const item = items[index];
    if (item != null) {
      items[index] = null;
      // Update serialized (array reference changes, so assign new array to trigger dirty)
      this.serialized.set('items', [...items]);
      // Explicitly mark dirty to ensure inventory changes are broadcast
      this.markDirty();
    }
    return item;
  }

  public updateItemState(index: number, state: any): void {
    const items = this.serialized.get('items');
    if (index >= 0 && index < items.length && items[index] != null) {
      items[index].state = state;
      // Update serialized (array reference changes, so assign new array to trigger dirty)
      this.serialized.set('items', [...items]);
      // Explicitly mark dirty to ensure inventory changes are broadcast
      this.markDirty();
    }
  }

  public getActiveItem(index: number | null): InventoryItem | null {
    if (index === null) return null;
    const items = this.serialized.get('items');
    // TODO: refactor this to be 0 based, why are we subtracting 1?
    return items[index - 1] ?? null;
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
    const items = this.serialized.get('items');
    const foundRecipe = recipes.find((it) => it.getType() === recipe);
    if (foundRecipe === undefined) {
      return { inventory: items, resources };
    }

    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    const result = foundRecipe.craft(items, resources, maxSlots);
    this.serialized.set('items', result.inventory);
    // Explicitly mark dirty to ensure inventory changes are broadcast
    this.markDirty();
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
    const items = this.serialized.get('items');
    if (items.length > 0) {
      this.serialized.set('items', []);
      // Explicitly mark dirty to ensure inventory changes are broadcast
      this.markDirty();
    }
  }

  public scatterItems(position: { x: number; y: number }): void {
    const items = this.serialized.get('items');
    const offset = 32;
    items.forEach((item: InventoryItem | null) => {
      if (item == null) return; // Skip null/undefined items
      const entity = this.createEntityFromItem(item);
      if (!entity) return;
      const theta = Math.random() * 2 * Math.PI;
      const radius = Math.random() * offset;
      const poolManager = PoolManager.getInstance();
      const pos = poolManager.vector2.claim(
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
    this.serialized.set('items', []);
    // Explicitly mark dirty to ensure inventory changes are broadcast
    this.markDirty();
  }

  private createEntityFromItem(item: InventoryItem) {
    return this.self.getEntityManager()!.createEntityFromItem(item);
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Inventory.type));
    writer.writeArray(this.serialized.get('items'), (item: InventoryItem | null) => {
      if (item === null || item === undefined) {
        writer.writeBoolean(false);
      } else {
        writer.writeBoolean(true);
        writer.writeString(item.itemType);
        // Serialize ItemState
        writer.writeRecord((item.state || {}) as Record<string, unknown>, (value) => {
          if (typeof value === "number") {
            writer.writeFloat64(value);
          } else {
            writer.writeString(String(value));
          }
        });
      }
    });
  }
}
