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
    { itemType: "cloth", price: 5 },

    // Ammunition
    { itemType: "pistol_ammo", price: 15 },
    { itemType: "shotgun_ammo", price: 20 },

    // Explosives & Throwables
    { itemType: "landmine", price: 50 },
    { itemType: "grenade", price: 30 },
    { itemType: "fire_extinguisher", price: 25 },

    // Light & Fuel
    { itemType: "torch", price: 8 },
    { itemType: "gasoline", price: 12 },
  ] as MerchantShopItem[],
};

export type MerchantConfig = typeof merchantConfig;
