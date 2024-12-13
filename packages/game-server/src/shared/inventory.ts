export type ItemType = "Knife" | "Shotgun" | "Pistol" | "Wood" | "Wall" | "Bandage";

export interface InventoryItem {
  key: ItemType;
  state?: any;
}
