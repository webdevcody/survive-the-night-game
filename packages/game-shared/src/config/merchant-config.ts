/**
 * ========================================================================
 * MERCHANT CONFIGURATION
 * ========================================================================
 * Shop items and pricing - now auto-generated from item/weapon configs
 */

import { itemRegistry } from "../entities/item-registry";
import { weaponRegistry } from "../entities/weapon-registry";

export interface MerchantShopItem {
  itemType: string;
  price: number;
}

/**
 * Generate shop items dynamically from item and weapon registries
 * Items/weapons with merchant.enabled === true will be included
 */
function generateShopItems(): MerchantShopItem[] {
  const shopItems: MerchantShopItem[] = [];

  // Add items with merchant enabled
  itemRegistry.getAll().forEach((itemConfig) => {
    if (itemConfig.merchant?.enabled) {
      shopItems.push({
        itemType: itemConfig.id,
        price: itemConfig.merchant.price,
      });
    }
  });

  // Add weapons with merchant enabled
  weaponRegistry.getAll().forEach((weaponConfig) => {
    if (weaponConfig.merchant?.enabled) {
      shopItems.push({
        itemType: weaponConfig.id,
        price: weaponConfig.merchant.price,
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
