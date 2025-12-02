import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import Carryable from "@/extensions/carryable";
import { ItemType, isResourceItem, ResourceType, InventoryItem } from "@shared/util/inventory";
import PoolManager from "@shared/util/pool-manager";
import { Merchant } from "@/entities/environment/merchant";
import { SocketEventHandler } from "./types";
import { itemRegistry, weaponRegistry, resourceRegistry } from "@shared/entities";
import { entityOverrideRegistry } from "@/entities/entity-override-registry";
import { StackableItem } from "@/entities/items/stackable-item";
import { IGameManagers } from "@/managers/types";
import { PlayerPickedUpItemEvent } from "@shared/events/server-sent/events/pickup-item-event";
import { balanceConfig } from "@shared/config/balance-config";

/**
 * Validate merchant buy data
 */
function validateMerchantBuyData(data: unknown): { merchantId: number; itemIndex: number } | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Validate merchantId - must be a finite positive integer
  const merchantId = obj.merchantId;
  if (
    typeof merchantId !== "number" ||
    !Number.isFinite(merchantId) ||
    !Number.isInteger(merchantId) ||
    merchantId < 0
  ) {
    return null;
  }

  // Validate itemIndex - must be a finite non-negative integer
  const itemIndex = obj.itemIndex;
  if (
    typeof itemIndex !== "number" ||
    !Number.isFinite(itemIndex) ||
    !Number.isInteger(itemIndex) ||
    itemIndex < 0
  ) {
    return null;
  }

  return { merchantId, itemIndex };
}

/**
 * Validate merchant sell data
 */
function validateMerchantSellData(
  data: unknown,
): { merchantId: number; inventorySlot: number } | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Validate merchantId - must be a finite positive integer
  const merchantId = obj.merchantId;
  if (
    typeof merchantId !== "number" ||
    !Number.isFinite(merchantId) ||
    !Number.isInteger(merchantId) ||
    merchantId < 0
  ) {
    return null;
  }

  // Validate inventorySlot - must be a finite non-negative integer
  const inventorySlot = obj.inventorySlot;
  if (
    typeof inventorySlot !== "number" ||
    !Number.isFinite(inventorySlot) ||
    !Number.isInteger(inventorySlot) ||
    inventorySlot < 0
  ) {
    return null;
  }

  return { merchantId, inventorySlot };
}

/**
 * Check if an item can be stacked in inventory.
 * Items are stackable if:
 * - They have a count state property (meaning they're stackable in inventory)
 * - OR they have category "ammo" (all ammo items are stackable)
 */
function isStackableItem(item: InventoryItem): boolean {
  // Check if item has count state (stackable in inventory)
  if (item.state && typeof item.state.count === "number") {
    return true;
  }

  // Check if item category is "ammo" (all ammo is stackable)
  const itemConfig = itemRegistry.get(item.itemType);
  if (itemConfig && itemConfig.category === "ammo") {
    return true;
  }

  return false;
}

/**
 * Get the default count for a stackable item type (like ammo, throwables, placeables)
 * Returns undefined if the item doesn't have a default count
 */
function getDefaultCountForItem(
  itemType: ItemType,
  gameManagers: IGameManagers,
): number | undefined {
  const entityConstructor = entityOverrideRegistry.get(itemType);
  if (!entityConstructor) {
    return undefined;
  }

  // First, check for static DEFAULT_COUNT or DEFAULT_AMMO_COUNT properties on the class
  // This covers non-StackableItem entities like MolotovCocktail, Grenade, ThrowingKnife, etc.
  const constructorWithStatic = entityConstructor as unknown as {
    DEFAULT_COUNT?: number;
    DEFAULT_AMMO_COUNT?: number;
  };

  if (typeof constructorWithStatic.DEFAULT_COUNT === "number") {
    return constructorWithStatic.DEFAULT_COUNT;
  }

  if (typeof constructorWithStatic.DEFAULT_AMMO_COUNT === "number") {
    return constructorWithStatic.DEFAULT_AMMO_COUNT;
  }

  // Fall back to StackableItem method for items that extend StackableItem
  try {
    const tempInstance = new entityConstructor(gameManagers);
    if (tempInstance instanceof StackableItem) {
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
  data: { merchantId: number; itemIndex: number },
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
  const totalPrice = selectedItem.price + balanceConfig.BASE_PURCHASE_PRICE;

  // Check if player has enough coins
  if (playerCoins < totalPrice) {
    return;
  }

  // Deduct coins
  player.addCoins(-totalPrice);

  const itemType = selectedItem.itemType as ItemType;

  // Check if this is a resource item (wood, cloth)
  if (isResourceItem(itemType)) {
    // Add directly to player's resource count (this will broadcast the pickup event)
    player.addResource(itemType as ResourceType, 1);
  } else {
    // Handle regular inventory items
    // Get default count for stackable items (like ammo)
    const gameManagers = context.getGameManagers();
    const defaultCount = getDefaultCountForItem(itemType, gameManagers);
    const item =
      defaultCount !== undefined ? { itemType, state: { count: defaultCount } } : { itemType };
    const inventory = player.getExt(Inventory);
    const items = inventory.getItems();

    // Check if item is stackable and if there's an existing stack to merge into
    const isStackable = isStackableItem(item);
    let merged = false;

    if (isStackable && item.state?.count) {
      // Find existing item of the same type
      const existingItemIndex = items.findIndex((it) => it != null && it.itemType === itemType);

      if (existingItemIndex >= 0) {
        // Merge into existing stack
        const existingItem = items[existingItemIndex];
        if (existingItem) {
          const existingCount = existingItem.state?.count ?? defaultCount ?? 1;
          const newCount = existingCount + item.state.count;
          inventory.updateItemState(existingItemIndex, { count: newCount });
          merged = true;
          // Broadcast pickup event for consistency with addItem
          context.broadcastEvent(
            new PlayerPickedUpItemEvent({
              playerId: player.getId(),
              itemType: itemType,
            }),
          );
        }
      }
    }

    // If not merged, try to add as new item or drop if inventory is full
    if (!merged) {
      if (inventory.isFull()) {
        // Drop item 32 pixels down from player
        const playerPos = player.getExt(Positionable).getPosition();
        const poolManager = PoolManager.getInstance();
        const dropPosition = poolManager.vector2.claim(playerPos.x, playerPos.y + 32);
        const droppedEntity = context.getEntityManager().createEntityFromItem(item);
        if (droppedEntity) {
          droppedEntity.getExt(Positionable).setPosition(dropPosition);

          // Ensure Carryable extension has the correct state (especially for stackable items)
          if (droppedEntity.hasExt(Carryable) && item.state) {
            droppedEntity.getExt(Carryable).setItemState(item.state);
          }

          // Add entity to the world so it can be picked up
          context.getEntityManager().addEntity(droppedEntity);
        }
      } else {
        inventory.addItem(item);
      }
    }
  }
}

export function onMerchantSell(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { merchantId: number; inventorySlot: number },
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
    return;
  }

  // Handle stackable items (like ammo)
  const gameManagers = context.getGameManagers();
  const isStackable = isStackableItem(item);
  const defaultCount = isStackable ? getDefaultCountForItem(itemType, gameManagers) : undefined;
  const currentCount = item.state?.count ?? (isStackable ? (defaultCount ?? 1) : 1);

  if (isStackable && defaultCount !== undefined) {
    // Stackable item: must have at least the default count to sell
    if (currentCount < defaultCount) {
      // Not enough to sell - player needs a full stack
      return;
    }

    // Subtract default count from stack
    const remainingCount = currentCount - defaultCount;
    if (remainingCount > 0) {
      // Update the item state with remaining count
      inventory.updateItemState(data.inventorySlot, { count: remainingCount });
    } else {
      // Remove item if count reaches 0
      inventory.removeItem(data.inventorySlot);
    }
    // Give coins based on sell price
    player.addCoins(sellPrice);
  } else {
    // Non-stackable item: sell entire item
    inventory.removeItem(data.inventorySlot);
    player.addCoins(sellPrice);
  }
}

export const merchantBuyHandler: SocketEventHandler<{ merchantId: number; itemIndex: number }> = {
  event: "MERCHANT_BUY",
  handler: (context, socket, data) => {
    const validated = validateMerchantBuyData(data);
    if (!validated) {
      console.warn(`Invalid merchant buy data from socket ${socket.id}`);
      return;
    }
    onMerchantBuy(context, socket, validated);
  },
};

export const merchantSellHandler: SocketEventHandler<{
  merchantId: number;
  inventorySlot: number;
}> = {
  event: "MERCHANT_SELL",
  handler: (context, socket, data) => {
    const validated = validateMerchantSellData(data);
    if (!validated) {
      console.warn(`Invalid merchant sell data from socket ${socket.id}`);
      return;
    }
    onMerchantSell(context, socket, validated);
  },
};
