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
