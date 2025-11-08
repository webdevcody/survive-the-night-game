import { ItemState } from "@/types/entity";

export const ITEM_TYPES = [
  "knife",
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
  "fire_extinguisher",
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
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export interface InventoryItem {
  itemType: ItemType;
  state?: ItemState;
}

export type WeaponKey =
  | "knife"
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
 */
export const RESOURCE_ITEMS: ReadonlySet<ItemType> = new Set(["wood", "cloth"] as const);

/**
 * Check if an item type is a resource (wood, cloth)
 */
export function isResourceItem(itemType: ItemType): boolean {
  return RESOURCE_ITEMS.has(itemType);
}
