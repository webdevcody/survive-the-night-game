import { ItemState } from "@/types/entity";
import { weaponRegistry } from "@/entities";
import { WeaponType } from "@/types/weapons";

export const ITEM_TYPES = [
  "knife",
  "baseball_bat",
  "shotgun",
  "pistol",
  "wood",
  "wall",
  "bandage",
  "cloth",
  "torch",
  "gasoline",
  "spikes",
  "pistol_ammo",
  "shotgun_ammo",
  "landmine",
  "grenade",
  "coin",
  "bolt_action_rifle",
  "ak47",
  "grenade_launcher",
  "bolt_action_ammo",
  "ak47_ammo",
  "grenade_launcher_ammo",
  "flamethrower",
  "flamethrower_ammo",
  "sentry_gun",
  "crate",
  "miners_hat",
  "bear_trap",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export interface InventoryItem {
  itemType: ItemType;
  state?: ItemState;
}

export type WeaponKey =
  | "knife"
  | "baseball_bat"
  | "shotgun"
  | "pistol"
  | "bolt_action_rifle"
  | "ak47"
  | "grenade"
  | "grenade_launcher"
  | "flamethrower";

/**
 * Resource items that increment player resource counts (wood, cloth)
 * rather than being added to inventory
 * To add a new resource: add it to this array and update ResourceType below
 */
const RESOURCE_ITEMS_ARRAY = ["wood", "cloth"] as const;

/**
 * Type representing valid resource types
 * Derived from RESOURCE_ITEMS_ARRAY - add new resources here
 */
export type ResourceType = (typeof RESOURCE_ITEMS_ARRAY)[number];

/**
 * Set of resource items for runtime checks
 */
export const RESOURCE_ITEMS: ReadonlySet<ItemType> = new Set(RESOURCE_ITEMS_ARRAY);

/**
 * Check if an item type is a resource (wood, cloth)
 */
export function isResourceItem(itemType: ItemType): boolean {
  return RESOURCE_ITEMS.has(itemType);
}

/**
 * Check if an item type is a weapon by looking it up in the weapon registry.
 * This is data-driven from WEAPON_CONFIGS - any weapon added to configs
 * will automatically be recognized here.
 */
export function isWeapon(itemType: ItemType): boolean {
  return weaponRegistry.has(itemType as WeaponType);
}
