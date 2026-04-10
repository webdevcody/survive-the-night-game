import { itemRegistry } from "../entities/item-registry";

export function isHealingConsumable(itemType: string): boolean {
  return itemRegistry.get(itemType)?.healable === true;
}
