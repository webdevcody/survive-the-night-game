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
import { entityBlocksPlacement } from "@shared/entities/decal-registry";
import { IEntity } from "@/entities/types";
import { EntityType } from "@shared/types/entity";
import Vector2 from "@/util/vector2";

/**
 * Validate place structure data
 */
function validatePlaceStructureData(
  data: unknown
): { itemType: ItemType; position: { x: number; y: number } } | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Validate itemType - must be a string
  const itemType = obj.itemType;
  if (typeof itemType !== "string") {
    return null;
  }

  // Validate position object
  const position = obj.position;
  if (typeof position !== "object" || position === null) {
    return null;
  }

  const posObj = position as Record<string, unknown>;

  // Validate position.x - must be a finite number
  const x = posObj.x;
  if (typeof x !== "number" || !Number.isFinite(x)) {
    return null;
  }

  // Validate position.y - must be a finite number
  const y = posObj.y;
  if (typeof y !== "number" || !Number.isFinite(y)) {
    return null;
  }

  return {
    itemType: itemType as ItemType,
    position: { x, y },
  };
}

/**
 * Check if placing an item on an existing entity should trigger an upgrade.
 * Returns the upgrade target item type if an upgrade is possible, null otherwise.
 */
function getUpgradeTarget(
  placingItemType: ItemType,
  existingEntityType: EntityType
): ItemType | null {
  const itemConfig = itemRegistry.get(placingItemType);
  if (!itemConfig?.upgradeTo) {
    return null;
  }

  // Check if the existing entity is the same type as what we're placing
  // (e.g., placing a "wall" on a "wall" entity should upgrade to "wall_level_2")
  if (existingEntityType === placingItemType) {
    return itemConfig.upgradeTo as ItemType;
  }

  return null;
}

/**
 * Find an existing entity at the placement position that can be upgraded.
 * Returns the entity if found and upgradeable, null otherwise.
 */
function findUpgradeableEntity(
  context: HandlerContext,
  placePos: Vector2,
  placingItemType: ItemType,
  structureSize: number
): IEntity | null {
  const nearbyEntities = context.getEntityManager().getNearbyEntities(placePos, structureSize * 2);

  for (const entity of nearbyEntities) {
    if (!entity.hasExt(Positionable)) continue;

    const entityType = entity.getType();
    // Skip entities that don't block placement (e.g., visual-only decals)
    if (!entityBlocksPlacement(entityType)) continue;

    const entityPos = entity.getExt(Positionable).getCenterPosition();
    const dx = Math.abs(entityPos.x - (placePos.x + structureSize / 2));
    const dy = Math.abs(entityPos.y - (placePos.y + structureSize / 2));

    if (dx < structureSize && dy < structureSize) {
      // Check if this entity can be upgraded
      const upgradeTarget = getUpgradeTarget(placingItemType, entityType);
      console.log(
        `[Upgrade Check] Placing ${placingItemType} on ${entityType}, upgrade target: ${upgradeTarget}`
      );
      if (upgradeTarget) {
        return entity;
      }
    }
  }

  return null;
}

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

  // Validate grid position bounds
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

  // Check if any entities are at this position
  const structureSize = TILE_SIZE;

  // First, check if we can upgrade an existing structure (before checking collidables)
  const upgradeableEntity = findUpgradeableEntity(context, placePos, data.itemType, structureSize);

  if (upgradeableEntity) {
    // Handle upgrade scenario
    const upgradeTarget = getUpgradeTarget(data.itemType, upgradeableEntity.getType())!;

    // Remove item from inventory
    const item = inventoryItems[itemIndex];
    if (item?.state?.count && item.state.count > 1) {
      inventory.updateItemState(itemIndex, {
        ...item.state,
        count: item.state.count - 1,
      });
    } else {
      inventory.removeItem(itemIndex);
    }
    player.markExtensionDirty(inventory);

    // Get the position of the existing entity before removing it
    const existingPos = upgradeableEntity.getExt(Positionable).getPosition();

    // Remove the existing entity
    context.getEntityManager().markEntityForRemoval(upgradeableEntity);

    // Create the upgraded entity
    const upgradedEntity = context.getEntityManager().createEntityFromItem({
      itemType: upgradeTarget,
      state: {},
    });

    if (!upgradedEntity) {
      console.log(`Failed to create upgraded entity for ${upgradeTarget}`);
      return;
    }

    upgradedEntity.getExt(Positionable).setPosition(existingPos);
    context.getEntityManager().addEntity(upgradedEntity);

    console.log(
      `Player ${player.getId()} upgraded ${upgradeableEntity.getType()} to ${upgradeTarget} at (${existingPos.x}, ${existingPos.y})`
    );

    // Broadcast build event for upgrade
    const upgradeItemConfig = itemRegistry.get(upgradeTarget);
    if (upgradeItemConfig?.placeSound) {
      context.broadcastEvent(
        new BuildEvent({
          playerId: player.getId(),
          position: { x: existingPos.x, y: existingPos.y },
          soundType: upgradeItemConfig.placeSound,
        })
      );
    }

    return;
  }

  // Normal placement - check if grid position is occupied by map tile
  if (mapData.collidables[gridY][gridX] !== -1) {
    console.log(`Player ${player.getId()} tried to place ${data.itemType} on occupied tile`);
    return;
  }

  // Check if position is blocked by entities
  const nearbyEntities = context.getEntityManager().getNearbyEntities(placePos, structureSize * 2);

  for (const entity of nearbyEntities) {
    if (!entity.hasExt(Positionable)) continue;

    const entityType = entity.getType();
    // Skip entities that don't block placement (e.g., visual-only decals)
    if (!entityBlocksPlacement(entityType)) continue;

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
  handler: (context, socket, data) => {
    const validated = validatePlaceStructureData(data);
    if (!validated) {
      console.warn(`Invalid place structure data from socket ${socket.id}`);
      return;
    }
    onPlaceStructure(context, socket, validated);
  },
};
