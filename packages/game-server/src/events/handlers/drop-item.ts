import { ISocketAdapter } from "@shared/network/socket-adapter";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import Carryable from "@/extensions/carryable";
import { Direction } from "@shared/util/direction";
import PoolManager from "@shared/util/pool-manager";
import { SocketEventHandler } from "./types";
import { PlayerDroppedItemEvent } from "@/events/server-sent/events/player-dropped-item-event";
import { HandlerContext } from "@/events/context";

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

  const COMBINE_RADIUS_PLAYER = 20;
  const COMBINE_RADIUS_DROP = 20;

  function tryCombineAtPosition(x: number, y: number, radius: number): boolean {
    const checkPos = pool.vector2.claim(x, y);
    const nearby = entityManager.getNearbyEntities(checkPos, radius);

    for (let i = 0; i < nearby.length; i++) {
      const other = nearby[i];

      if (!other.hasExt(Carryable)) continue;
      if (!other.hasExt(Positionable)) continue;

      const otherCarry = other.getExt(Carryable);

      if (otherCarry.getItemType() !== droppedType) continue;

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

  if (facing === Direction.Up) {
    dy = -16;
  } else if (facing === Direction.Down) {
    dy = 16;
  } else if (facing === Direction.Left) {
    dx = -16;
  } else {
    dx = 16;
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
  handler: onDropItem,
};
