import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import Carryable from "@/extensions/carryable";
import { Direction } from "@shared/util/direction";
import PoolManager from "@shared/util/pool-manager";
import { SocketEventHandler } from "./types";
import { PlayerDroppedItemEvent } from "../../../../game-shared/src/events/server-sent/events/player-dropped-item-event";

export function onDropItem(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { slotIndex: number }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  const itemIndex = data.slotIndex;
  const inventory = player.getExt(Inventory);
  const currentItem = inventory.getItems()[itemIndex];

  if (!currentItem) return;

  // Remove item from inventory
  const item = inventory.removeItem(itemIndex);

  if (!item) return;

  // Create entity from item
  const entity = player.getEntityManager().createEntityFromItem(item);

  if (!entity) return;

  const carryable = entity.getExt(Carryable);
  carryable.setItemState({
    count: item.state?.count || 0,
  });

  // Calculate drop position based on player facing direction
  const offset = 16;
  let dx = 0;
  let dy = 0;
  const inputFacing = player.serialized.get("inputFacing") ?? Direction.Right;

  if (inputFacing === Direction.Up) {
    dy = -offset;
  } else if (inputFacing === Direction.Down) {
    dy = offset;
  } else if (inputFacing === Direction.Left) {
    dx = -offset;
  } else if (inputFacing === Direction.Right) {
    dx = offset;
  }

  const poolManager = PoolManager.getInstance();
  const pos = poolManager.vector2.claim(player.getPosition().x + dx, player.getPosition().y + dy);

  // Check for nearby items of the same type within radius 20
  const combineRadius = 20;
  const nearbyEntities = player.getEntityManager().getNearbyEntities(pos, combineRadius);
  
  // Find an item of the same type to combine with
  let combined = false;
  for (const nearbyEntity of nearbyEntities) {
    if (!nearbyEntity.hasExt(Carryable) || !nearbyEntity.hasExt(Positionable)) {
      continue;
    }

    const nearbyCarryable = nearbyEntity.getExt(Carryable);
    if (nearbyCarryable.getItemType() !== item.itemType) {
      continue;
    }

    // Check if within radius (getNearbyEntities uses spatial grid which may include slightly further entities)
    const nearbyPos = nearbyEntity.getExt(Positionable).getCenterPosition();
    const dx2 = pos.x - nearbyPos.x;
    const dy2 = pos.y - nearbyPos.y;
    const distanceSquared = dx2 * dx2 + dy2 * dy2;
    
    if (distanceSquared <= combineRadius * combineRadius) {
      // Combine counts
      const nearbyState = nearbyCarryable.getItemState();
      const nearbyCount = nearbyState?.count || 1;
      const droppedCount = item.state?.count || 1;
      const newCount = nearbyCount + droppedCount;
      
      // setItemState automatically marks the extension as dirty
      nearbyCarryable.setItemState({
        ...nearbyState,
        count: newCount,
      });
      
      // Remove the dropped entity since we combined it
      player.getEntityManager().markEntityForRemoval(entity);
      combined = true;
      break;
    }
  }

  // If not combined, add the entity normally
  if (!combined) {
    if (entity.hasExt(Positionable)) {
      entity.getExt(Positionable).setPosition(pos);
    }
    player.getEntityManager().addEntity(entity);
  }

  // Broadcast drop event
  player
    .getEntityManager()
    .getBroadcaster()
    .broadcastEvent(
      new PlayerDroppedItemEvent({
        playerId: player.getId(),
        itemType: item.itemType,
      })
    );
}

export const dropItemHandler: SocketEventHandler<{ slotIndex: number }> = {
  event: "DROP_ITEM",
  handler: onDropItem,
};
