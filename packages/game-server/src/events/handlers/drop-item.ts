import { ISocketAdapter } from "@shared/network/socket-adapter";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import Carryable from "@/extensions/carryable";
import { Direction } from "@shared/util/direction";
import PoolManager from "@shared/util/pool-manager";
import { SocketEventHandler } from "./types";
import { PlayerDroppedItemEvent } from "@/events/server-sent/events/player-dropped-item-event";
import { HandlerContext } from "@/events/context";
import { itemRegistry } from "@shared/entities/item-registry";
import { InventoryItem } from "@shared/util/inventory";
import { getConfig } from "@shared/config";

/**
 * Validate drop item data
 */
function validateDropItemData(
  data: unknown
): { slotIndex: number; amount?: number } | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Validate slotIndex - must be a finite non-negative integer
  const slotIndex = obj.slotIndex;
  if (
    typeof slotIndex !== "number" ||
    !Number.isFinite(slotIndex) ||
    !Number.isInteger(slotIndex) ||
    slotIndex < 0
  ) {
    return null;
  }

  // Validate amount - optional, but if present must be a finite positive integer
  const amount = obj.amount;
  if (amount !== undefined && amount !== null) {
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      !Number.isInteger(amount) ||
      amount < 1
    ) {
      return null;
    }
    return { slotIndex, amount };
  }

  return { slotIndex };
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

export function onDropItem(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { slotIndex: number; amount?: number }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  const inventory = player.getExt(Inventory);
  const items = inventory.getItems();

  const index = data.slotIndex;
  const item = items[index];
  if (!item) return;

  let totalCount = 1;
  if (item.state && typeof item.state.count === "number") {
    totalCount = item.state.count;
  }

  let reqAmount = data.amount;
  let dropAmount = totalCount;

  // Validate amount
  if (reqAmount != null) {
    reqAmount = Math.floor(reqAmount);

    if (reqAmount < 1) {
      reqAmount = 1;
    }

    if (reqAmount < dropAmount) {
      dropAmount = reqAmount;
    }
  }

  if (dropAmount <= 0) return;

  const entityManager = player.getEntityManager();
  let itemToDrop = item;

  // ---------------------------------------------
  // PARTIAL DROP OR FULL DROP
  // ---------------------------------------------
  if (item.state && totalCount > dropAmount) {
    // Partial drop
    const remaining = totalCount - dropAmount;
    item.state.count = remaining;

    itemToDrop = {
      itemType: item.itemType,
      state: {
        count: dropAmount,
      },
    };
  } else {
    // Full drop
    const removed = inventory.removeItem(index);
    if (!removed) return;

    if (removed.state && typeof removed.state.count === "number") {
      removed.state.count = dropAmount;
    }

    itemToDrop = removed;
  }

  inventory.markDirty();

  // CREATE ENTITY
  const entity = entityManager.createEntityFromItem(itemToDrop);
  if (!entity) return;

  const carryable = entity.getExt(Carryable);
  let finalCount = 1;

  if (itemToDrop.state && typeof itemToDrop.state.count === "number") {
    finalCount = itemToDrop.state.count;
  }

  carryable.setItemState({ count: finalCount });

  // -------------------------------------------------------
  // COMBINE LOGIC
  // -------------------------------------------------------
  const pool = PoolManager.getInstance();
  const playerPos = player.getPosition();
  const droppedType = itemToDrop.itemType;

  const COMBINE_RADIUS_PLAYER = 15;
  const COMBINE_RADIUS_DROP = 20;

  // Only allow combining if the item is stackable
  const isStackable = isStackableItem(itemToDrop);

  function tryCombineAtPosition(x: number, y: number, radius: number): boolean {
    // Don't try to combine if item is not stackable
    if (!isStackable) return false;

    const checkPos = pool.vector2.claim(x, y);
    const nearby = entityManager.getNearbyEntities(checkPos, radius);

    for (let i = 0; i < nearby.length; i++) {
      const other = nearby[i];

      if (!other.hasExt(Carryable)) continue;
      if (!other.hasExt(Positionable)) continue;

      const otherCarry = other.getExt(Carryable);

      if (otherCarry.getItemType() !== droppedType) continue;

      // Also check if the nearby item is stackable
      const otherItemState = otherCarry.getItemState();
      const otherItem: InventoryItem = {
        itemType: otherCarry.getItemType(),
        state: otherItemState,
      };
      if (!isStackableItem(otherItem)) continue;

      const posExt = other.getExt(Positionable);
      const otherPos = posExt.getCenterPosition();

      const dx = checkPos.x - otherPos.x;
      const dy = checkPos.y - otherPos.y;

      if (dx * dx + dy * dy <= radius * radius) {
        const st = otherCarry.getItemState();

        let existing = 1;
        if (st && typeof st.count === "number") {
          existing = st.count;
        }

        const newCount = existing + finalCount;
        otherCarry.setItemState({ count: newCount });

        if (!entity) return false;
        entityManager.markEntityForRemoval(entity);

        if (!player) return false;
        const broadcaster = entityManager.getBroadcaster();
        broadcaster.broadcastEvent(
          new PlayerDroppedItemEvent({
            playerId: player.getId(),
            itemType: droppedType,
          })
        );

        return true;
      }
    }

    return false;
  }

  // 1) Try merging at player's feet
  const mergedAtPlayer = tryCombineAtPosition(playerPos.x, playerPos.y, COMBINE_RADIUS_PLAYER);
  if (mergedAtPlayer) return;

  // ---------------------------------------------
  // DETERMINE DROP OFFSET
  // ---------------------------------------------
  const facing = player.getSerialized().get("inputFacing");

  let dx = 0;
  let dy = 0;

  const dropOffset = getConfig().world.TILE_SIZE;
  if (facing === Direction.Up) {
    dy = -dropOffset;
  } else if (facing === Direction.Down) {
    dy = dropOffset;
  } else if (facing === Direction.Left) {
    dx = -dropOffset;
  } else {
    dx = dropOffset;
  }

  const dropPosX = playerPos.x + dx;
  const dropPosY = playerPos.y + dy;

  // 2) Try merging at drop location
  const mergedAtDrop = tryCombineAtPosition(dropPosX, dropPosY, COMBINE_RADIUS_DROP);
  if (mergedAtDrop) return;

  // ---------------------------------------------
  // FINAL: PLACE ITEM ON FLOOR
  // ---------------------------------------------
  const dropPos = pool.vector2.claim(dropPosX, dropPosY);
  const posExt = entity.getExt(Positionable);

  if (posExt) {
    posExt.setPosition(dropPos);
  }

  entityManager.addEntity(entity);

  const broadcaster = entityManager.getBroadcaster();
  broadcaster.broadcastEvent(
    new PlayerDroppedItemEvent({
      playerId: player.getId(),
      itemType: droppedType,
    })
  );
}

export const dropItemHandler: SocketEventHandler<{ slotIndex: number; amount?: number }> = {
  event: "DROP_ITEM",
  handler: (context, socket, data) => {
    const validated = validateDropItemData(data);
    if (!validated) {
      console.warn(`Invalid drop item data from socket ${socket.id}`);
      return;
    }
    onDropItem(context, socket, validated);
  },
};
