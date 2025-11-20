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
  data: { slotIndex: number }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  const inventory = player.getExt(Inventory);
  const items = inventory.getItems();

  const index = data.slotIndex;
  const itemInSlot = items[index];
  if (!itemInSlot) return;

  // Remove from inventory
  const removedItem = inventory.removeItem(index);
  if (!removedItem) return;

  const entityManager = player.getEntityManager();
  const droppedType = removedItem.itemType;

  // Create dropped entity
  const newEntity = entityManager.createEntityFromItem(removedItem);
  if (!newEntity) return;

  const carryable = newEntity.getExt(Carryable);
  const dropCount = removedItem.state?.count ?? 1;
  carryable.setItemState({ count: dropCount });

  const pool = PoolManager.getInstance();

  // --- FIRST: try combining at PLAYER POSITION ---
  const playerPos = player.getPosition();
  const combineCheckPos = pool.vector2.claim(playerPos.x, playerPos.y);

  const COMBINE_RADIUS = 20;
  const COMBINE_RADIUS_SQ = COMBINE_RADIUS * COMBINE_RADIUS;

  const nearby = entityManager.getNearbyEntities(combineCheckPos, COMBINE_RADIUS);

  for (let i = 0; i < nearby.length; i++) {
    const e = nearby[i];

    if (!e.hasExt(Carryable) || !e.hasExt(Positionable)) continue;

    const eCarry = e.getExt(Carryable);
    if (eCarry.getItemType() !== droppedType) continue;

    // Distance check
    const ePos = e.getExt(Positionable).getCenterPosition();

    const dx = combineCheckPos.x - ePos.x;
    const dy = combineCheckPos.y - ePos.y;

    if (dx * dx + dy * dy <= COMBINE_RADIUS_SQ) {
      // Merge them: fastest possible
      const state = eCarry.getItemState();
      const existingCount = state?.count ?? 1;
      eCarry.setItemState({ count: existingCount + dropCount });

      entityManager.markEntityForRemoval(newEntity);

      entityManager.getBroadcaster().broadcastEvent(
        new PlayerDroppedItemEvent({
          playerId: player.getId(),
          itemType: droppedType,
        })
      );

      return; // done
    }
  }

  // --- NO COMBINE → DROP AT FACING OFFSET ---
  const facing = player.getSerialized().get("inputFacing") ?? Direction.Right;

  let dx = 0;
  let dy = 0;

  // fastest readable switch
  switch (facing) {
    case Direction.Up:
      dy = -16;
      break;
    case Direction.Down:
      dy = 16;
      break;
    case Direction.Left:
      dx = -16;
      break;
    case Direction.Right:
      dx = 16;
      break;
  }

  const dropPos = pool.vector2.claim(playerPos.x + dx, playerPos.y + dy);

  const posExt = newEntity.getExt(Positionable);
  if (posExt) {
    posExt.setPosition(dropPos);
  }

  entityManager.addEntity(newEntity);

  // broadcast
  entityManager.getBroadcaster().broadcastEvent(
    new PlayerDroppedItemEvent({
      playerId: player.getId(),
      itemType: droppedType,
    })
  );
}

export const dropItemHandler: SocketEventHandler<{ slotIndex: number }> = {
  event: "DROP_ITEM",
  handler: onDropItem,
};
