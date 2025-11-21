/**
 * ========================================================================
 * MERCHANT CONFIGURATION
 * ========================================================================
 * Shop items and pricing - now auto-generated from item/weapon/resource configs
 */

import { itemRegistry } from "../entities/item-registry";
import { weaponRegistry } from "../entities/weapon-registry";
import { resourceRegistry } from "../entities/resource-registry";

export interface MerchantShopItem {
  itemType: string;
  price: number;
}

/**
 * Generate shop items dynamically from item, weapon, and resource registries
 * Items/weapons/resources with merchant.buyable === true will be included
 * Returns all buyable items (no randomization)
 */
function generateShopItems(): MerchantShopItem[] {
  const shopItems: MerchantShopItem[] = [];

  // Add items with merchant buyable
  itemRegistry.getAll().forEach((itemConfig) => {
    const buyable = itemConfig.merchant?.buyable ?? itemConfig.merchant?.enabled ?? false;
    if (buyable && itemConfig.merchant?.price !== undefined) {
      shopItems.push({
        itemType: itemConfig.id,
        price: itemConfig.merchant.price,
      });
    }
  });

  // Add weapons with merchant buyable
  weaponRegistry.getAll().forEach((weaponConfig) => {
    const buyable = weaponConfig.merchant?.buyable ?? weaponConfig.merchant?.enabled ?? false;
    if (buyable && weaponConfig.merchant?.price !== undefined) {
      shopItems.push({
        itemType: weaponConfig.id,
        price: weaponConfig.merchant.price,
      });
    }
  });

  // Add resources with merchant buyable
  resourceRegistry.getAll().forEach((resourceConfig) => {
    const buyable = resourceConfig.merchant?.buyable ?? resourceConfig.merchant?.enabled ?? false;
    if (buyable && resourceConfig.merchant?.price !== undefined) {
      shopItems.push({
        itemType: resourceConfig.id,
        price: resourceConfig.merchant.price,
      });
    }
  });

  return shopItems;
}

export const merchantConfig = {
  /**
   * Items available in the merchant shop with their prices in coins
   * Auto-generated from item and weapon configs
   */
  get SHOP_ITEMS(): MerchantShopItem[] {
    return generateShopItems();
  },
};

export type MerchantConfig = typeof merchantConfig;
