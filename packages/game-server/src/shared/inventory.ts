export type ItemType = "Knife" | "Shotgun" | "Pistol" | "Wood" | "Wall" | "Bandage" | "Cloth";

export interface InventoryItem {
  key: ItemType;
  state?: any;
}

export type WeaponKey = "Knife" | "Shotgun" | "Pistol";
