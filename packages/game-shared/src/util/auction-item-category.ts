import { itemRegistry } from "../entities/item-registry";
import { resourceRegistry } from "../entities/resource-registry";
import { weaponRegistry } from "../entities/weapon-registry";

/** Coarse tab filter for auction UI + stored on listing rows. */
export type AuctionItemCategory = "weapon" | "ammo" | "resource" | "item";

export function getAuctionItemCategory(itemType: string): AuctionItemCategory {
  if (weaponRegistry.has(itemType)) {
    return "weapon";
  }
  const itemCfg = itemRegistry.get(itemType);
  if (itemCfg?.category === "ammo") {
    return "ammo";
  }
  if (resourceRegistry.has(itemType)) {
    return "resource";
  }
  return "item";
}
