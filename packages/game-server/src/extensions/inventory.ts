import { Extension } from "@/extensions/types";
import {
  InventoryItem,
  ItemType,
  isWeapon,
  canItemGoInEquipmentSlot,
  createEmptyEquipment,
  type EquipmentSlotKey,
  type PlayerEquipmentState,
} from "../../../game-shared/src/util/inventory";
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
import { itemTypeRegistry } from "@shared/util/item-type-encoding";
import { writeItemState } from "@shared/util/item-state-serialization";

/**
 * Item drop table with weighted chances.
 * Higher weight = higher chance of dropping.
 */
const ITEM_DROP_TABLE: Array<{ itemType: ItemType; weight: number }> = [
  // Common items (high weight)
  { itemType: "wood", weight: 25 },
  { itemType: "cloth", weight: 25 },
  { itemType: "bandage", weight: 15 },
  { itemType: "coin", weight: 10 },

  // Ammo (medium weight)
  { itemType: "pistol_ammo", weight: 12 },
  { itemType: "shotgun_ammo", weight: 12 },
  { itemType: "arrow_ammo", weight: 12 },
  { itemType: "bow", weight: 10 },
  { itemType: "pistol", weight: 10 },

  // Uncommon items (medium weight)
  { itemType: "shotgun", weight: 6 },
  { itemType: "knife", weight: 8 },
  { itemType: "throwing_knife", weight: 8 },
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
];

import { ExtensionBase } from "./extension-base";

type InventoryFields = {
  items: (InventoryItem | null)[];
  equipment: PlayerEquipmentState;
};

export default class Inventory extends ExtensionBase<InventoryFields> {
  public static readonly type = "inventory";

  private broadcaster: Broadcaster;

  public constructor(self: IEntity, broadcaster: Broadcaster) {
    super(self, { items: [], equipment: createEmptyEquipment() });
    this.broadcaster = broadcaster;
  }

  public getEquipment(): PlayerEquipmentState {
    return this.serialized.get("equipment");
  }

  public getItems(): (InventoryItem | null)[] {
    return this.serialized.get("items");
  }

  public isFull(): boolean {
    const items = this.serialized.get("items");
    // Count non-null items instead of array length to support sparse arrays
    const itemCount = items.filter((item: InventoryItem | null) => item != null).length;
    return itemCount >= getConfig().player.MAX_INVENTORY_SLOTS;
  }

  public hasItem(itemType: ItemType): boolean {
    const items = this.serialized.get("items");
    if (items.some((it: InventoryItem | null) => it?.itemType === itemType)) {
      return true;
    }
    const eq = this.serialized.get("equipment");
    return eq.head?.itemType === itemType || eq.mainHand?.itemType === itemType;
  }

  public addItem(item: InventoryItem): void {
    if (this.isFull()) return;

    const items = this.serialized.get("items");

    // Find first empty slot (null/undefined) to fill
    const emptySlotIndex = items.findIndex((it: InventoryItem | null) => it == null);
    if (emptySlotIndex !== -1) {
      items[emptySlotIndex] = item;
    } else {
      // No empty slots, push to end
      items.push(item);
    }

    // Update serialized (array reference changes, so assign new array to trigger dirty)
    this.serialized.set("items", [...items]);
    // Explicitly mark dirty to ensure inventory changes are broadcast
    this.markDirty();

    this.broadcaster.broadcastEvent(
      new PlayerPickedUpItemEvent({
        playerId: this.self.getId(),
        itemType: item.itemType,
      })
    );
  }

  /**
   * Sum stack counts in the bag for an item type (non-stackable items count as 1).
   */
  public getTotalCount(itemType: ItemType): number {
    const items = this.serialized.get("items");
    let sum = 0;
    for (const it of items) {
      if (!it || it.itemType !== itemType) continue;
      sum += it.state?.count ?? 1;
    }
    return sum;
  }

  /**
   * Merge into an existing stack of the same type, or add a new slot.
   * When the bag is full, still succeeds if an existing stack can absorb the item (same as Carryable).
   */
  public addOrMergeStack(item: InventoryItem): boolean {
    const items = this.serialized.get("items");
    const addCount = item.state?.count ?? 1;

    const existingItemIndex = items.findIndex(
      (it: InventoryItem | null) => it != null && it.itemType === item.itemType
    );

    if (existingItemIndex >= 0) {
      const existing = items[existingItemIndex];
      if (existing) {
        const prev = existing.state?.count ?? 1;
        this.updateItemState(existingItemIndex, { count: prev + addCount });
        this.broadcaster.broadcastEvent(
          new PlayerPickedUpItemEvent({
            playerId: this.self.getId(),
            itemType: item.itemType,
          })
        );
        return true;
      }
    }

    if (this.isFull()) {
      return false;
    }

    this.addItem(item);
    return true;
  }

  /**
   * Remove a total amount of an item type across bag stacks (e.g. paying with coins).
   * Returns true if at least `amount` was removed.
   */
  public removeCountAcrossStacks(itemType: ItemType, amount: number): boolean {
    if (amount <= 0) {
      return true;
    }

    const items = this.serialized.get("items");
    let remaining = amount;

    for (let i = 0; i < items.length && remaining > 0; i++) {
      const it = items[i];
      if (!it || it.itemType !== itemType) continue;

      const stackCount = it.state?.count ?? 1;
      if (stackCount <= remaining) {
        remaining -= stackCount;
        items[i] = null;
      } else {
        const newCount = stackCount - remaining;
        remaining = 0;
        items[i] = {
          ...it,
          state: { ...it.state, count: newCount },
        };
      }
    }

    if (remaining > 0) {
      return false;
    }

    this.serialized.set("items", [...items]);
    this.markDirty();
    return true;
  }

  public removeItem(index: number): InventoryItem | undefined {
    const items = this.serialized.get("items");
    // Don't use splice - just set to null to preserve inventory positions
    const item = items[index];
    if (item != null) {
      items[index] = null;
      // Update serialized (array reference changes, so assign new array to trigger dirty)
      this.serialized.set("items", [...items]);
      // Explicitly mark dirty to ensure inventory changes are broadcast
      this.markDirty();
    }
    return item;
  }

  public updateItemState(index: number, state: any): void {
    const items = this.serialized.get("items");
    if (index >= 0 && index < items.length && items[index] != null) {
      items[index].state = state;
      // Update serialized (array reference changes, so assign new array to trigger dirty)
      this.serialized.set("items", [...items]);
      // Explicitly mark dirty to ensure inventory changes are broadcast
      this.markDirty();
    }
  }

  public swapItems(fromIndex: number, toIndex: number): void {
    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= maxSlots || toIndex >= maxSlots) {
      return;
    }

    const items = this.serialized.get("items");
    while (items.length < maxSlots) {
      items.push(null);
    }

    const temp = items[fromIndex];
    items[fromIndex] = items[toIndex];
    items[toIndex] = temp;

    this.serialized.set("items", [...items]);
    this.markDirty();
  }

  /**
   * Swap bag slot with an equipment slot. Validates the item entering equipment.
   */
  public swapBagAndEquipment(bagIndex: number, equipSlot: EquipmentSlotKey): void {
    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    if (bagIndex < 0 || bagIndex >= maxSlots) {
      return;
    }

    const items = this.serialized.get("items");
    while (items.length < maxSlots) {
      items.push(null);
    }

    const bagItem = items[bagIndex];
    const equipment = this.serialized.get("equipment");
    const equipItem = equipment[equipSlot];

    if (bagItem != null && !canItemGoInEquipmentSlot(bagItem.itemType, equipSlot)) {
      return;
    }

    items[bagIndex] = equipItem;
    equipment[equipSlot] = bagItem;

    this.serialized.set("items", [...items]);
    this.serialized.set("equipment", { ...equipment });
    this.markDirty();
  }

  public getActiveItem(index: number | null): InventoryItem | null {
    if (index === null) return null;
    const items = this.serialized.get("items");
    // TODO: refactor this to be 0 based, why are we subtracting 1?
    return items[index - 1] ?? null;
  }

  public getActiveWeapon(activeItem: InventoryItem | null): InventoryItem | null {
    if (!activeItem) return null;
    return isWeapon(activeItem.itemType) ? activeItem : null;
  }

  /** Equipped main-hand weapon if any; otherwise weapon in active bag slot. */
  public resolveActiveWeapon(activeBagItem: InventoryItem | null): InventoryItem | null {
    const main = this.serialized.get("equipment").mainHand;
    if (main && isWeapon(main.itemType)) {
      return main;
    }
    return this.getActiveWeapon(activeBagItem);
  }

  public craftRecipe(recipe: RecipeType): {
    inventory: InventoryItem[];
    itemToDrop?: InventoryItem;
  } {
    const items = this.serialized.get("items");
    const foundRecipe = recipes.find((it) => it.getType() === recipe);
    if (foundRecipe === undefined) {
      return { inventory: items };
    }

    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    const result = foundRecipe.craft(items, maxSlots);
    this.serialized.set("items", result.inventory);
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
    const items = this.serialized.get("items");
    const hadItems = items.length > 0;
    const hadEquip =
      this.serialized.get("equipment").head != null ||
      this.serialized.get("equipment").mainHand != null;
    if (hadItems) {
      this.serialized.set("items", []);
    }
    if (hadEquip) {
      this.serialized.set("equipment", createEmptyEquipment());
    }
    if (hadItems || hadEquip) {
      this.markDirty();
    }
  }

  public scatterItems(position: { x: number; y: number }): void {
    const scatterOne = (item: InventoryItem | null) => {
      if (item == null) return;
      const entity = this.createEntityFromItem(item);
      if (!entity) return;
      const offset = 32;
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
    };

    const items = this.serialized.get("items");
    items.forEach((item: InventoryItem | null) => scatterOne(item));

    const equipment = this.serialized.get("equipment");
    scatterOne(equipment.head);
    scatterOne(equipment.mainHand);

    this.serialized.set("items", []);
    this.serialized.set("equipment", createEmptyEquipment());
    this.markDirty();
  }

  private createEntityFromItem(item: InventoryItem) {
    return this.self.getEntityManager()!.createEntityFromItem(item);
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Inventory.type));
    writer.writeArray(this.serialized.get("items"), (item: InventoryItem | null) => {
      if (item === null || item === undefined) {
        writer.writeBoolean(false);
      } else {
        writer.writeBoolean(true);
        writer.writeUInt8(itemTypeRegistry.encode(item.itemType));
        writeItemState(writer, item.state);
      }
    });
    const equipment = this.serialized.get("equipment");
    const writeSlot = (item: InventoryItem | null) => {
      if (item === null || item === undefined) {
        writer.writeBoolean(false);
      } else {
        writer.writeBoolean(true);
        writer.writeUInt8(itemTypeRegistry.encode(item.itemType));
        writeItemState(writer, item.state);
      }
    };
    writeSlot(equipment.head);
    writeSlot(equipment.mainHand);
  }
}
