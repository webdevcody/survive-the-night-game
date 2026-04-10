import { Extension } from "@/extensions/types";
import {
  InventoryItem,
  ItemType,
  isWeapon,
  canItemGoInEquipmentSlot,
  createEmptyEquipment,
  EQUIPMENT_SLOT_KEYS,
  type EquipmentSlotKey,
  type PlayerEquipmentState,
} from "../../../game-shared/src/util/inventory";
import {
  coercePlayerInventoryPersistedPayload,
  type PlayerInventoryPersistedPayload,
} from "@shared/util/persisted-inventory-payload";
import { recipes, RecipeType } from "../../../game-shared/src/util/recipes";
import { Broadcaster } from "@/managers/types";
import { PlayerPickedUpItemEvent } from "../../../game-shared/src/events/server-sent/events/pickup-item-event";
import Positionable from "@/extensions/positionable";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { getConfig } from "@/config";
import { FISTS_INVENTORY_SENTINEL } from "@shared/constants/inventory-sentinel";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { itemTypeRegistry } from "@shared/util/item-type-encoding";
import { writeItemState } from "@shared/util/item-state-serialization";
import {
  LEGACY_RANDOM_DROP_TABLE,
  resolveZombieDropStackCount,
  type ZombieDropTableEntry,
} from "@shared/config/zombie-drop-tables";

import { ExtensionBase } from "./extension-base";

type InventoryFields = {
  items: (InventoryItem | null)[];
  equipment: PlayerEquipmentState;
};

export default class Inventory extends ExtensionBase<InventoryFields> {
  public static readonly type = "inventory";

  private broadcaster: Broadcaster;

  private notifyPlayerWeaponLoadout(): void {
    const owner = this.self as { sanitizeWeaponLoadouts?: () => void };
    owner.sanitizeWeaponLoadouts?.();
  }

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

  /** Bag slot cap (base + player strength when attached to a Player). */
  public getMaxSlots(): number {
    const owner = this.self as { getMaxInventorySlots?: () => number };
    if (typeof owner.getMaxInventorySlots === "function") {
      return owner.getMaxInventorySlots();
    }
    return getConfig().player.MAX_INVENTORY_SLOTS;
  }

  public isFull(): boolean {
    const items = this.serialized.get("items");
    const itemCount = items.filter((item: InventoryItem | null) => item != null).length;
    return itemCount >= this.getMaxSlots();
  }

  public hasItem(itemType: ItemType): boolean {
    const items = this.serialized.get("items");
    if (items.some((it: InventoryItem | null) => it?.itemType === itemType)) {
      return true;
    }
    const eq = this.serialized.get("equipment");
    for (const key of EQUIPMENT_SLOT_KEYS) {
      if (eq[key]?.itemType === itemType) {
        return true;
      }
    }
    return false;
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
    this.notifyPlayerWeaponLoadout();

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
   * Remove a total amount of an item type from bag stacks, then armor equipment slots
   * (same coverage as {@link hasItem}). A stack of count1 is cleared to `null`.
   * Returns true if the full `amount` was removed.
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
      const equipment = this.serialized.get("equipment");
      const nextEq: PlayerEquipmentState = { ...equipment };
      let equipmentTouched = false;
      for (const key of EQUIPMENT_SLOT_KEYS) {
        if (remaining <= 0) break;
        const it = nextEq[key];
        if (!it || it.itemType !== itemType) continue;
        const stackCount = it.state?.count ?? 1;
        if (stackCount <= remaining) {
          remaining -= stackCount;
          nextEq[key] = null;
          equipmentTouched = true;
        } else {
          const newCount = stackCount - remaining;
          remaining = 0;
          nextEq[key] = {
            ...it,
            state: { ...it.state, count: newCount },
          };
          equipmentTouched = true;
        }
      }
      if (equipmentTouched) {
        this.serialized.set("equipment", nextEq);
      }
    }

    if (remaining > 0) {
      return false;
    }

    this.serialized.set("items", [...items]);
    this.markDirty();
    this.notifyPlayerWeaponLoadout();
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
      this.notifyPlayerWeaponLoadout();
    }
    return item ?? undefined;
  }

  public updateItemState(index: number, state: any): void {
    const items = this.serialized.get("items");
    if (index >= 0 && index < items.length && items[index] != null) {
      items[index].state = state;
      // Update serialized (array reference changes, so assign new array to trigger dirty)
      this.serialized.set("items", [...items]);
      // Explicitly mark dirty to ensure inventory changes are broadcast
      this.markDirty();
      this.notifyPlayerWeaponLoadout();
    }
  }

  private mutateSwapBagSlots(fromIndex: number, toIndex: number): void {
    const maxSlots = this.getMaxSlots();
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
  }

  public swapItems(fromIndex: number, toIndex: number): void {
    this.mutateSwapBagSlots(fromIndex, toIndex);
    this.markDirty();
    this.notifyPlayerWeaponLoadout();
  }

  /**
   * Swap two bag cells without running weapon-loadout sanitize.
   * Caller must update loadout indices then call player.sanitizeWeaponLoadouts().
   */
  public swapBagSlotsDeferWeaponResync(fromIndex: number, toIndex: number): void {
    this.mutateSwapBagSlots(fromIndex, toIndex);
    this.markDirty();
  }

  /**
   * Swap bag slot with an equipment slot. Validates the item entering equipment.
   */
  public swapBagAndEquipment(bagIndex: number, equipSlot: EquipmentSlotKey): void {
    const maxSlots = this.getMaxSlots();
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
    this.notifyPlayerWeaponLoadout();
  }

  public getActiveItem(index: number | null): InventoryItem | null {
    if (index === null) return null;
    // Fists / unarmed selection (not a bag slot)
    if (index === FISTS_INVENTORY_SENTINEL) return null;
    const items = this.serialized.get("items");
    // TODO: refactor this to be 0 based, why are we subtracting 1?
    return items[index - 1] ?? null;
  }

  public getActiveWeapon(activeItem: InventoryItem | null): InventoryItem | null {
    if (!activeItem) return null;
    return isWeapon(activeItem.itemType) ? activeItem : null;
  }

  /** Weapon in the active bag slot (no separate weapon equipment slot). */
  public resolveActiveWeapon(activeBagItem: InventoryItem | null): InventoryItem | null {
    return this.getActiveWeapon(activeBagItem);
  }

  public craftRecipe(recipe: RecipeType): {
    inventory: (InventoryItem | null)[];
    itemToDrop?: InventoryItem;
  } {
    const items = this.serialized.get("items");
    const foundRecipe = recipes.find((it) => it.getType() === recipe);
    if (foundRecipe === undefined) {
      return { inventory: items };
    }

    const maxSlots = this.getMaxSlots();
    const result = foundRecipe.craft(items as InventoryItem[], maxSlots);
    this.serialized.set("items", result.inventory);
    // Explicitly mark dirty to ensure inventory changes are broadcast
    this.markDirty();
    this.notifyPlayerWeaponLoadout();
    return result;
  }

  public addRandomItem(chance = 1, dropTable: ZombieDropTableEntry[] = LEGACY_RANDOM_DROP_TABLE): this {
    if (Math.random() < chance) {
      const entry = this.getWeightedRandomEntry(dropTable);
      const count = resolveZombieDropStackCount(entry);
      const item: InventoryItem =
        count > 1 ? { itemType: entry.itemType, state: { count } } : { itemType: entry.itemType };
      this.addItem(item);
    }
    return this;
  }

  /**
   * Selects a random row from the drop table based on weighted probabilities.
   * Items with higher weights have a higher chance of being selected.
   */
  private getWeightedRandomEntry(dropTable: ZombieDropTableEntry[]): ZombieDropTableEntry {
    const totalWeight = dropTable.reduce((sum, entry) => sum + entry.weight, 0);
    let random = Math.random() * totalWeight;

    for (const entry of dropTable) {
      random -= entry.weight;
      if (random <= 0) {
        return entry;
      }
    }

    return dropTable[0];
  }

  /** Website / disconnect: JSON-serializable bag + equipment snapshot. */
  public toPersistedPayload(): PlayerInventoryPersistedPayload {
    return {
      items: structuredClone(this.serialized.get("items")) as (InventoryItem | null)[],
      equipment: structuredClone(this.serialized.get("equipment")) as PlayerEquipmentState,
    };
  }

  /** Apply validated snapshot (e.g. after hydrate from DB). */
  public applyPersistedPayload(
    payload: PlayerInventoryPersistedPayload,
    options?: { skipWeaponNotify?: boolean },
  ): void {
    const coerced = coercePlayerInventoryPersistedPayload(payload);
    if (!coerced) {
      return;
    }
    const max = this.getMaxSlots();
    const next: (InventoryItem | null)[] = [];
    for (let i = 0; i < max; i++) {
      next.push(coerced.items[i] ?? null);
    }
    this.serialized.set("items", next);
    this.serialized.set("equipment", { ...coerced.equipment });
    this.markDirty();
    if (!options?.skipWeaponNotify) {
      this.notifyPlayerWeaponLoadout();
    }
  }

  public clear(): void {
    const items = this.serialized.get("items");
    const hadItems = items.length > 0;
    const eq = this.serialized.get("equipment");
    const hadEquip = EQUIPMENT_SLOT_KEYS.some((k) => eq[k] != null);
    if (hadItems) {
      this.serialized.set("items", []);
    }
    if (hadEquip) {
      this.serialized.set("equipment", createEmptyEquipment());
    }
    if (hadItems || hadEquip) {
      this.markDirty();
      this.notifyPlayerWeaponLoadout();
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
    for (const key of EQUIPMENT_SLOT_KEYS) {
      scatterOne(equipment[key]);
    }

    this.serialized.set("items", []);
    this.serialized.set("equipment", createEmptyEquipment());
    this.markDirty();
    this.notifyPlayerWeaponLoadout();
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
    for (const key of EQUIPMENT_SLOT_KEYS) {
      writeSlot(equipment[key]);
    }
  }
}
