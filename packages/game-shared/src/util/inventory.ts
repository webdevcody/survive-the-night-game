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
