import { ItemState } from "../types/entity";
import { weaponRegistry, resourceRegistry } from "../entities";
import { itemRegistry } from "../entities/item-registry";

export type ItemType = string;

export interface InventoryItem {
  itemType: ItemType;
  state?: ItemState;
}

export type WeaponKey = string;

/**
 * Type representing valid resource types
 * Derived from resource registry - any resource added to RESOURCE_CONFIGS
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

/** Server-backed equipment slots (v1: head + main hand) */
export type EquipmentSlotKey = "head" | "mainHand";

export interface PlayerEquipmentState {
  head: InventoryItem | null;
  mainHand: InventoryItem | null;
}

export function createEmptyEquipment(): PlayerEquipmentState {
  return { head: null, mainHand: null };
}

/** Network encoding: 0 = head, 1 = mainHand */
export function encodeEquipmentSlotKey(slot: EquipmentSlotKey): number {
  return slot === "head" ? 0 : 1;
}

export function decodeEquipmentSlotKey(value: number): EquipmentSlotKey | null {
  if (value === 0) return "head";
  if (value === 1) return "mainHand";
  return null;
}

/**
 * Whether an item type may be placed in the given equipment slot (used when moving from bag → equip).
 */
export function canItemGoInEquipmentSlot(itemType: ItemType, slot: EquipmentSlotKey): boolean {
  if (slot === "head") {
    return itemRegistry.get(itemType)?.wearable === true;
  }
  if (slot === "mainHand") {
    return isWeapon(itemType);
  }
  return false;
}
