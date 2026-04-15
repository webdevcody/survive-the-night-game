import { isWeapon } from "@shared/util/inventory";
import { itemRegistry } from "@shared/entities/item-registry";
import { weaponRegistry } from "@shared/entities/weapon-registry";
import { resourceRegistry } from "@shared/entities/resource-registry";
import type { MerchantShopItem } from "@shared/config";
import type { InventoryItem } from "@shared/util/inventory";
import { balanceConfig } from "@shared/config/balance-config";

export type MerchantCategoryTab = "all" | "weapon" | "ammo" | "item";

export function matchesMerchantCategoryTab(itemType: string, tab: MerchantCategoryTab): boolean {
  if (tab === "all") return true;
  if (tab === "weapon") return isWeapon(itemType);
  if (tab === "ammo") {
    const conf = itemRegistry.get(itemType);
    return conf?.category === "ammo";
  }
  if (tab === "item") {
    const isWep = isWeapon(itemType);
    const conf = itemRegistry.get(itemType);
    return !isWep && conf?.category !== "ammo";
  }
  return false;
}

export function getRequiredStackSizeForMerchant(itemType: string): number {
  const weapon = weaponRegistry.get(itemType);
  if (weapon?.merchant?.stackSize !== undefined) {
    return weapon.merchant.stackSize;
  }
  const item = itemRegistry.get(itemType);
  if (item?.merchant?.stackSize !== undefined) {
    return item.merchant.stackSize;
  }
  const resource = resourceRegistry.get(itemType);
  if (resource?.merchant?.stackSize !== undefined) {
    return resource.merchant.stackSize;
  }
  return 1;
}

export function getMerchantBasePrice(itemType: string, shopItems: MerchantShopItem[]): number {
  const shopItem = shopItems.find((i) => i.itemType === itemType);
  if (shopItem) return shopItem.price;
  const weapon = weaponRegistry.get(itemType);
  if (weapon?.merchant?.price !== undefined) return weapon.merchant.price;
  const item = itemRegistry.get(itemType);
  if (item?.merchant?.price !== undefined) return item.merchant.price;
  const resource = resourceRegistry.get(itemType);
  if (resource?.merchant?.price !== undefined) return resource.merchant.price;
  return 0;
}

export type MerchantShopGridEntry = {
  itemType: string;
  buyPrice: number;
  originalIndex: number;
};

export function buildMerchantShopGridEntries(
  shopItems: MerchantShopItem[],
  tab: MerchantCategoryTab,
): MerchantShopGridEntry[] {
  const out: MerchantShopGridEntry[] = [];
  shopItems.forEach((row, index) => {
    if (!matchesMerchantCategoryTab(row.itemType, tab)) return;
    out.push({
      itemType: row.itemType,
      buyPrice: row.price + balanceConfig.BASE_PURCHASE_PRICE,
      originalIndex: index,
    });
  });
  return out;
}

export function canSellItemToMerchant(item: InventoryItem, shopItems: MerchantShopItem[]): boolean {
  const basePrice = getMerchantBasePrice(item.itemType, shopItems);
  const sellPrice = Math.floor(basePrice * 0.5);
  if (sellPrice <= 0) return false;
  const requiredStackSize = getRequiredStackSizeForMerchant(item.itemType);
  const currentCount = item.state?.count ?? 1;
  return currentCount >= requiredStackSize;
}
