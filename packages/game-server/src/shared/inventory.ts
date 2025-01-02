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
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export interface InventoryItem {
  key: ItemType;
  state?: any;
}

export type WeaponKey = "knife" | "shotgun" | "pistol";
