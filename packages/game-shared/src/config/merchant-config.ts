/**
 * ========================================================================
 * MERCHANT CONFIGURATION
 * ========================================================================
 * Shop items and pricing
 */

export interface MerchantShopItem {
  itemType: string;
  price: number;
}

export const merchantConfig = {
  /**
   * Items available in the merchant shop with their prices in coins
   */
  SHOP_ITEMS: [
    // Consumables & Healing
    { itemType: "bandage", price: 10 },
    { itemType: "cloth", price: 4 },

    // Ammunition
    { itemType: "pistol_ammo", price: 8 },
    { itemType: "shotgun_ammo", price: 12 },

    // Explosives & Throwables
    { itemType: "landmine", price: 20 },
    { itemType: "grenade", price: 20 },
    { itemType: "fire_extinguisher", price: 5 },

    // Light & Fuel
    { itemType: "torch", price: 5 },
    { itemType: "gasoline", price: 10 },
  ] as MerchantShopItem[],
};

export type MerchantConfig = typeof merchantConfig;
