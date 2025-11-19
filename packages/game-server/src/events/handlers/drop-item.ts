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

  if (entity.hasExt(Positionable)) {
    entity.getExt(Positionable).setPosition(pos);
  }

  player.getEntityManager().addEntity(entity);

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
