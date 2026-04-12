import { itemRegistry } from "../entities/item-registry";

/** True if this item can be assigned to hotbar consumable slots (4 / 5). */
export function itemMatchesConsumableLoadout(itemType: string): boolean {
  const config = itemRegistry.get(itemType);
  return config?.category === "consumable" && config.wearable !== true;
}
