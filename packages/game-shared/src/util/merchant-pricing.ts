import type { EntityType } from "../types/entity";
import { itemRegistry } from "../entities/item-registry";
import { weaponRegistry } from "../entities/weapon-registry";
import { resourceRegistry } from "../entities/resource-registry";

/**
 * Merchant buy price when the shop entry is enabled; otherwise 0.
 * Used to rank items/recipes by approximate economic "value".
 */
export function getMerchantBuyPriceForEntityType(type: EntityType): number {
  const config = itemRegistry.get(type) ?? weaponRegistry.get(type) ?? resourceRegistry.get(type);
  if (!config?.merchant?.enabled) {
    return 0;
  }
  const n = config.merchant.price;
  return typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : 0;
}
