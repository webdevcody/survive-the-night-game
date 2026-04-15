import { ItemState } from "../types/entity";
import { weaponRegistry, resourceRegistry } from "../entities";
import { itemRegistry } from "../entities/item-registry";
import type { ArmorEquipmentSlotKey } from "../entities/item-registry";

export type ItemType = string;

export interface InventoryItem {
  itemType: ItemType;
  state?: ItemState;
}

export type WeaponKey = string;

/**
 * Type representing valid resource types
 * Derived from the resource registry - any resource added to RESOURCE_CONFIGS
 * will automatically be recognized here
 */
export type ResourceType = string;

/**
 * Check if an item type is a resource by looking it up in the resource registry.
 * This is data-driven from RESOURCE_CONFIGS - any resource added to configs
 * will automatically be recognized here.
 */
export function isResourceItem(itemType: ItemType): boolean {
  return resourceRegistry.has(itemType);
}

/**
 * Check if an item type is a weapon by looking it up in the weapon registry.
 * This is data-driven from WEAPON_CONFIGS - any weapon added to configs
 * will automatically be recognized here.
 */
export function isWeapon(itemType: ItemType): boolean {
  return weaponRegistry.has(itemType);
}

/**
 * Get the ammo type for a weapon. Returns null if the weapon doesn't use ammo.
 */
export function getWeaponAmmoType(weaponType: ItemType): ItemType | null {
  const weaponConfig = weaponRegistry.get(weaponType);
  if (!weaponConfig) return null;

  const ammoType = weaponConfig.ammoType;
  return ammoType || null;
}

export function getWeaponMagazineSize(weaponType: ItemType): number | null {
  const weaponConfig = weaponRegistry.get(weaponType);
  const magazineSize = weaponConfig?.stats.magazineSize;
  if (typeof magazineSize !== "number" || !Number.isFinite(magazineSize) || magazineSize <= 0) {
    return null;
  }
  return Math.max(1, Math.floor(magazineSize));
}

export function getWeaponReloadDuration(weaponType: ItemType): number | null {
  const weaponConfig = weaponRegistry.get(weaponType);
  const reloadDuration = weaponConfig?.stats.reloadDuration;
  if (
    typeof reloadDuration !== "number" ||
    !Number.isFinite(reloadDuration) ||
    reloadDuration <= 0
  ) {
    return null;
  }
  return reloadDuration;
}

/** Armor / wearable slots only (weapons stay in bag / hotbar). Order is fixed for network and buffers (indices 0–6). */
export type EquipmentSlotKey = ArmorEquipmentSlotKey;

export const EQUIPMENT_SLOT_KEYS: readonly EquipmentSlotKey[] = [
  "head",
  "shoulders",
  "torso",
  "legs",
  "shoes",
  "back",
  "hands",
] as const;

export interface PlayerEquipmentState {
  head: InventoryItem | null;
  shoulders: InventoryItem | null;
  torso: InventoryItem | null;
  legs: InventoryItem | null;
  shoes: InventoryItem | null;
  back: InventoryItem | null;
  hands: InventoryItem | null;
}

export function createEmptyEquipment(): PlayerEquipmentState {
  return {
    head: null,
    shoulders: null,
    torso: null,
    legs: null,
    shoes: null,
    back: null,
    hands: null,
  };
}

/** Network encoding: index in EQUIPMENT_SLOT_KEYS (0–6). */
export function encodeEquipmentSlotKey(slot: EquipmentSlotKey): number {
  const i = EQUIPMENT_SLOT_KEYS.indexOf(slot);
  return i >= 0 ? i : 0;
}

export function decodeEquipmentSlotKey(value: number): EquipmentSlotKey | null {
  if (value >= 0 && value < EQUIPMENT_SLOT_KEYS.length) {
    return EQUIPMENT_SLOT_KEYS[value]!;
  }
  return null;
}

/**
 * Client encodes equipment drops as DROP_ITEM with slotIndex = base + equipment key index.
 * Bag slots must remain below this base (see player MAX_INVENTORY_SLOTS).
 */
export const DROP_ITEM_WIRE_EQUIPMENT_INDEX_BASE = 240;

export function encodeDropItemFromEquipmentSlot(slot: EquipmentSlotKey): number {
  return DROP_ITEM_WIRE_EQUIPMENT_INDEX_BASE + encodeEquipmentSlotKey(slot);
}

export function tryDecodeDropItemEquipmentSlot(slotIndex: number): EquipmentSlotKey | null {
  if (slotIndex < DROP_ITEM_WIRE_EQUIPMENT_INDEX_BASE) {
    return null;
  }
  return decodeEquipmentSlotKey(slotIndex - DROP_ITEM_WIRE_EQUIPMENT_INDEX_BASE);
}

/**
 * Whether an item type may be placed in the given equipment slot (used when moving from bag → equip).
 */
export function canItemGoInEquipmentSlot(itemType: ItemType, slot: EquipmentSlotKey): boolean {
  const cfg = itemRegistry.get(itemType);
  if (cfg?.equipmentSlot === slot) {
    return true;
  }
  // Legacy: wearable items without equipmentSlot only fit head
  if (slot === "head" && cfg?.wearable === true && cfg.equipmentSlot === undefined) {
    return true;
  }
  return false;
}

/**
 * Stackable in bag if it carries an explicit count or is registered as ammo.
 */
export function isStackableInventoryItem(item: InventoryItem): boolean {
  if (item.itemType === "sign" || item.itemType === "skateboard" || typeof item.state?.message === "string") {
    return false;
  }
  if (item.state && typeof item.state.count === "number") {
    return true;
  }
  const itemConfig = itemRegistry.get(item.itemType);
  return itemConfig?.category === "ammo";
}

/**
 * Non-mutating check: can the bag accept this item (new slot or merge into existing stack)?
 * Mirrors {@link Inventory.addOrMergeStack} eligibility without modifying state.
 */
export function canBagAcceptItem(
  bagItems: (InventoryItem | null)[],
  maxSlots: number,
  item: InventoryItem,
): boolean {
  const stackable = isStackableInventoryItem(item);
  if (stackable) {
    for (let i = 0; i < bagItems.length && i < maxSlots; i++) {
      const it = bagItems[i];
      if (it != null && it.itemType === item.itemType) {
        return true;
      }
    }
  }
  for (let i = 0; i < bagItems.length && i < maxSlots; i++) {
    if (bagItems[i] == null) {
      return true;
    }
  }
  return false;
}

/**
 * True if the player can receive `coinCount` more coins (merge or empty slot).
 */
export function canBagAcceptCoinCount(
  bagItems: (InventoryItem | null)[],
  maxSlots: number,
  coinCount: number,
): boolean {
  if (coinCount <= 0) return true;
  return canBagAcceptItem(bagItems, maxSlots, {
    itemType: "coin",
    state: { count: coinCount },
  });
}
