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
  "fire_extinguisher",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export interface InventoryItem {
  key: ItemType;
  state?: any;
}

export type WeaponKey = "knife" | "shotgun" | "pistol";
