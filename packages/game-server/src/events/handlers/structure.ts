import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { ItemType } from "@shared/util/inventory";
import { SocketEventHandler } from "./types";
import { itemRegistry } from "@shared/entities/item-registry";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import { getConfig } from "@shared/config";
import PoolManager from "@shared/util/pool-manager";
import { BuildEvent } from "../../../../game-shared/src/events/server-sent/events/build-event";

export function onPlaceStructure(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { itemType: ItemType; position: { x: number; y: number } }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  const itemConfig = itemRegistry.get(data.itemType);
  if (!itemConfig?.placeable) {
    return;
  }

  // Validate placement distance
  const playerPos = player.getExt(Positionable).getCenterPosition();
  const poolManager = PoolManager.getInstance();
  const placePos = poolManager.vector2.claim(data.position.x, data.position.y);
  const distance = playerPos.distance(placePos);
  const { MAX_PLACEMENT_RANGE, TILE_SIZE } = getConfig().world;

  if (distance > MAX_PLACEMENT_RANGE) {
    console.log(
      `Player ${player.getId()} tried to place ${data.itemType} too far away (${distance}px)`
    );
    return;
  }

  // Check if player has the item in inventory
  const inventory = player.getExt(Inventory);
  const inventoryItems = inventory.getItems();
  const itemIndex = inventoryItems.findIndex((item) => item?.itemType === data.itemType);

  if (itemIndex === -1) {
    console.log(`Player ${player.getId()} tried to place ${data.itemType} without having one`);
    return;
  }

  // Validate grid position is clear
  const gridX = Math.floor(data.position.x / TILE_SIZE);
  const gridY = Math.floor(data.position.y / TILE_SIZE);
  const mapData = context.getMapManager().getMapData();

  if (
    gridY < 0 ||
    gridY >= mapData.collidables.length ||
    gridX < 0 ||
    gridX >= mapData.collidables[0].length
  ) {
    console.log(`Player ${player.getId()} tried to place ${data.itemType} out of bounds`);
    return;
  }

  if (mapData.collidables[gridY][gridX] !== -1) {
    console.log(`Player ${player.getId()} tried to place ${data.itemType} on occupied tile`);
    return;
  }

  // Check if any entities are at this position
  const entities = context.getEntityManager().getEntities();
  const structureSize = TILE_SIZE;

  for (const entity of entities) {
    if (!entity.hasExt(Positionable)) continue;

    const entityPos = entity.getExt(Positionable).getCenterPosition();
    const dx = Math.abs(entityPos.x - (placePos.x + structureSize / 2));
    const dy = Math.abs(entityPos.y - (placePos.y + structureSize / 2));

    if (dx < structureSize && dy < structureSize) {
      console.log(`Player ${player.getId()} tried to place ${data.itemType} on existing entity`);
      return;
    }
  }

  // Remove item from inventory
  const item = inventoryItems[itemIndex];
  if (item?.state?.count && item.state.count > 1) {
    // Decrease count if there are multiple
    inventory.updateItemState(itemIndex, {
      ...item.state,
      count: item.state.count - 1,
    });
  } else {
    // Remove the item completely
    inventory.removeItem(itemIndex);
  }

  // Ensure player entity is marked dirty so inventory changes are broadcast
  // The inventory extension should already mark itself dirty via markDirty(),
  // but we explicitly ensure the extension is tracked in dirtyExtensions set
  // to guarantee the inventory update is serialized and sent to clients
  player.markExtensionDirty(inventory);

  const placedEntity = context.getEntityManager().createEntityFromItem({
    itemType: data.itemType,
    state: {},
  });

  if (!placedEntity) {
    console.log(`Failed to create entity for ${data.itemType}`);
    return;
  }

  placedEntity.getExt(Positionable).setPosition(placePos);
  context.getEntityManager().addEntity(placedEntity);

  console.log(`Player ${player.getId()} placed ${data.itemType} at (${placePos.x}, ${placePos.y})`);

  // Broadcast build event if item has a placeSound configured
  if (itemConfig.placeSound) {
    context.broadcastEvent(
      new BuildEvent({
        playerId: player.getId(),
        position: { x: placePos.x, y: placePos.y },
        soundType: itemConfig.placeSound,
      })
    );
  }
}

export const placeStructureHandler: SocketEventHandler<{
  itemType: ItemType;
  position: { x: number; y: number };
}> = {
  event: "PLACE_STRUCTURE",
  handler: onPlaceStructure,
};
