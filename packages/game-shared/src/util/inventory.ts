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
 * Check if an item type is ammo by checking if it ends with "_ammo"
 */
export function isAmmo(itemType: ItemType): boolean {
  return itemType.endsWith("_ammo");
}

/**
 * Get the weapon type for a given ammo type.
 * For example: "pistol_ammo" -> "pistol"
 */
export function getWeaponForAmmo(ammoType: ItemType): ItemType | null {
  if (!isAmmo(ammoType)) return null;
  return ammoType.replace("_ammo", "");
}

/**
 * Get the ammo type for a given weapon type.
 * For example: "pistol" -> "pistol_ammo"
 */
export function getAmmoForWeapon(weaponType: ItemType): ItemType | null {
  if (!isWeapon(weaponType)) return null;
  // Melee weapons don't use ammo
  const config = weaponRegistry.get(weaponType);
  if (config?.type === "melee") return null;
  return `${weaponType}_ammo`;
}
