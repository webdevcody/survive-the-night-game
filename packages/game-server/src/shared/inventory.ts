export const ITEM_TYPES = [
  "Knife",
  "Shotgun",
  "Pistol",
  "Wood",
  "Wall",
  "Bandage",
  "Cloth",
  "Torch",
  "Gasoline",
  "Spikes",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export interface InventoryItem {
  key: ItemType;
  state?: any;
}

export type WeaponKey = "Knife" | "Shotgun" | "Pistol";
