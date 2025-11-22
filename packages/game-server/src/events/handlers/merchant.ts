import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import { ItemType, isResourceItem, ResourceType } from "@shared/util/inventory";
import PoolManager from "@shared/util/pool-manager";
import { Merchant } from "@/entities/environment/merchant";
import { SocketEventHandler } from "./types";
import { itemRegistry, weaponRegistry, resourceRegistry } from "@shared/entities";
import { entityOverrideRegistry } from "@/entities/entity-override-registry";
import { StackableItem } from "@/entities/items/stackable-item";
import { IGameManagers } from "@/managers/types";

/**
 * Get the default count for a stackable item type (like ammo)
 * Returns undefined if the item doesn't have a default count or isn't a StackableItem
 */
function getDefaultCountForItem(
  itemType: ItemType,
  gameManagers: IGameManagers
): number | undefined {
  const entityConstructor = entityOverrideRegistry.get(itemType);
  if (!entityConstructor) {
    return undefined;
  }

  // Check if the constructor extends StackableItem by creating a temporary instance
  // and checking with instanceof. This is safe because we catch any errors.
  try {
    // Create a temporary instance to check if it's a StackableItem
    // We only need gameManagers since itemState is optional
    const tempInstance = new entityConstructor(gameManagers);
    if (tempInstance instanceof StackableItem) {
      // Use the static method to get the default count
      return StackableItem.getDefaultCount(entityConstructor as any, gameManagers);
    }
  } catch {
    // If construction fails or instance isn't a StackableItem, return undefined
  }

  return undefined;
}

export function onMerchantBuy(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { merchantId: number; itemIndex: number }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  // Find the merchant entity
  const merchant = context.getEntityManager().getEntityById(data.merchantId);
  if (!merchant || merchant.getType() !== "merchant") return;

  // Cast to Merchant to access getShopItems method
  const merchantEntity = merchant as Merchant;
  const shopItems = merchantEntity.getShopItems();
  if (!shopItems || data.itemIndex < 0 || data.itemIndex >= shopItems.length) return;

  const selectedItem = shopItems[data.itemIndex];
  const playerCoins = player.getCoins();

  // Check if player has enough coins
  if (playerCoins < selectedItem.price) {
    console.log(
      `Player ${player.getId()} tried to buy ${selectedItem.itemType} but doesn't have enough coins`
    );
    return;
  }

  // Deduct coins
  player.addCoins(-selectedItem.price);

  const itemType = selectedItem.itemType as ItemType;

  // Check if this is a resource item (wood, cloth)
  if (isResourceItem(itemType)) {
    // Add directly to player's resource count (this will broadcast the pickup event)
    player.addResource(itemType as ResourceType, 1);
    console.log(`Player ${player.getId()} bought ${itemType} for ${selectedItem.price} coins`);
  } else {
    // Handle regular inventory items
    // Get default count for stackable items (like ammo)
    const gameManagers = context.getGameManagers();
    const defaultCount = getDefaultCountForItem(itemType, gameManagers);
    const item =
      defaultCount !== undefined ? { itemType, state: { count: defaultCount } } : { itemType };
    const inventory = player.getExt(Inventory);

    // Add to inventory or drop on ground
    if (inventory.isFull()) {
      // Drop item 32 pixels down from player
      const playerPos = player.getExt(Positionable).getPosition();
      const poolManager = PoolManager.getInstance();
      const dropPosition = poolManager.vector2.claim(playerPos.x, playerPos.y + 32);
      const droppedEntity = context.getEntityManager().createEntityFromItem(item);
      if (droppedEntity) {
        droppedEntity.getExt(Positionable).setPosition(dropPosition);
        console.log(`Dropped ${itemType} on ground for player ${player.getId()}`);
      }
    } else {
      inventory.addItem(item);
      console.log(`Player ${player.getId()} bought ${itemType} for ${selectedItem.price} coins`);
    }
  }
}

export function onMerchantSell(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { merchantId: number; inventorySlot: number }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  // Find the merchant entity
  const merchant = context.getEntityManager().getEntityById(data.merchantId);
  if (!merchant || merchant.getType() !== "merchant") return;

  const inventory = player.getExt(Inventory);
  const items = inventory.getItems();
  const item = items[data.inventorySlot];

  if (!item) {
    return;
  }

  const itemType = item.itemType;
  let buyPrice = 0;

  // Determine buy price (base value)
  const weaponConfig = weaponRegistry.get(itemType);
  if (weaponConfig?.merchant?.price) {
    buyPrice = weaponConfig.merchant.price;
  } else {
    const itemConfig = itemRegistry.get(itemType);
    if (itemConfig?.merchant?.price) {
      buyPrice = itemConfig.merchant.price;
    } else {
      const resourceConfig = resourceRegistry.get(itemType);
      if (resourceConfig?.merchant?.price) {
        buyPrice = resourceConfig.merchant.price;
      }
    }
  }

  // If item has no price, it might not be sellable or defaults to 0
  // Let's assume sell price is 50% of buy price.
  // If buyPrice is 0/undefined, sellPrice is 0.
  const sellPrice = Math.floor(buyPrice * 0.5);

  if (sellPrice <= 0) {
    console.log(`Player ${player.getId()} tried to sell ${itemType} which has no value.`);
    return;
  }

  // Remove item from inventory
  inventory.removeItem(data.inventorySlot);

  // Add coins
  player.addCoins(sellPrice);

  console.log(`Player ${player.getId()} sold ${itemType} for ${sellPrice} coins.`);
}

export const merchantBuyHandler: SocketEventHandler<{ merchantId: number; itemIndex: number }> = {
  event: "MERCHANT_BUY",
  handler: onMerchantBuy,
};

export const merchantSellHandler: SocketEventHandler<{
  merchantId: number;
  inventorySlot: number;
}> = {
  event: "MERCHANT_SELL",
  handler: onMerchantSell,
};
