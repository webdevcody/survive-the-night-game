import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import { ItemType, isResourceItem, ResourceType } from "@shared/util/inventory";
import PoolManager from "@shared/util/pool-manager";
import { Merchant } from "@/entities/environment/merchant";
import { SocketEventHandler } from "./types";

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
    const item = { itemType };
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

export const merchantBuyHandler: SocketEventHandler<{ merchantId: number; itemIndex: number }> = {
  event: "MERCHANT_BUY",
  handler: onMerchantBuy,
};

