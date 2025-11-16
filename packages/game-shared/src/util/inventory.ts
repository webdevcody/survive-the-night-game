import { ItemState } from "@/types/entity";
import { weaponRegistry, resourceRegistry } from "@/entities";

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
 * Pattern: {weapon_id}_ammo (e.g., "pistol" -> "pistol_ammo")
 * Melee weapons (knife, baseball_bat) don't use ammo.
 */
export function getWeaponAmmoType(weaponType: ItemType): ItemType | null {
  const weaponConfig = weaponRegistry.get(weaponType);
  if (!weaponConfig) return null;
  
  // Melee weapons don't use ammo
  if (weaponConfig.type === "melee") return null;
  
  // Ranged weapons use {weapon_id}_ammo pattern
  return `${weaponType}_ammo` as ItemType;
}
