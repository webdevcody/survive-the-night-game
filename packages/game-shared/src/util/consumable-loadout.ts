import { itemRegistry } from "../entities/item-registry";
import { resourceRegistry } from "../entities/resource-registry";

/** True if this item can be assigned to hotbar consumable slots (4 / 5). */
export function itemMatchesConsumableLoadout(itemType: string): boolean {
  const itemConfig = itemRegistry.get(itemType);
  if (itemConfig?.category === "consumable" && itemConfig.wearable !== true) {
    return true;
  }
  return resourceRegistry.get(itemType)?.quickSlotConsumable === true;
}
