import { GameState } from "@/state";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientInteractive, ClientPositionable } from "@/extensions";
import { getPlayer } from "@/util/get-player";
import { distance } from "../../../game-shared/src/util/physics";
import { getConfig } from "@shared/config";
import { Entities } from "@shared/constants";
import { PlayerClient } from "@/entities/player";
import { SpatialGrid } from "@shared/util/spatial-grid";
import { isAutoPickupItem } from "@/util/auto-pickup";

// Client requires player to be slightly closer than server to account for latency
const CLIENT_INTERACT_RADIUS_BUFFER = 4;

/**
 * Finds the closest interactive entity to the player.
 * Uses the same logic as the server-side interaction handling.
 * Uses spatial grid for efficient entity lookup if available.
 */
export function getClosestInteractiveEntity(
  gameState: GameState,
  spatialGrid?: SpatialGrid<ClientEntityBase> | null
): ClientEntityBase | null {
  const player = getPlayer(gameState);
  if (!player || !player.hasExt(ClientPositionable)) {
    return null;
  }

  const playerPos = player.getExt(ClientPositionable).getCenterPosition();
  const maxRadius = getConfig().player.MAX_INTERACT_RADIUS - CLIENT_INTERACT_RADIUS_BUFFER;

  // Get all interactive entities within range using spatial grid if available
  let candidateEntities: ClientEntityBase[];
  if (spatialGrid) {
    // Use spatial grid to quickly find nearby entities
    const nearbyEntities = spatialGrid.getNearbyEntities(playerPos, maxRadius);
    candidateEntities = nearbyEntities.filter((entity) => {
      if (!(entity instanceof ClientEntityBase)) return false;
      if (!entity.hasExt(ClientInteractive)) return false;
      if (!entity.hasExt(ClientPositionable)) return false;
      if (entity.getId() === player.getId()) return false;
      return true;
    }) as ClientEntityBase[];
  } else {
    return null;
  }

  // Filter to entities within exact radius (spatial grid gives approximate results)
  // Also filter out auto-pickup items - they don't need manual interaction
  const interactiveEntities = candidateEntities.filter((entity) => {
    const entityPos = entity.getExt(ClientPositionable).getCenterPosition();
    if (distance(playerPos, entityPos) > maxRadius) {
      return false;
    }
    // Skip auto-pickup items - they will be picked up automatically
    if (isAutoPickupItem(entity, player)) {
      return false;
    }
    return true;
  });

  if (interactiveEntities.length === 0) {
    return null;
  }

  // Pre-calculate distances and dead player flags
  const entityData = interactiveEntities.map((entity) => {
    const entityPos = entity.getExt(ClientPositionable).getCenterPosition();
    return {
      entity,
      distance: distance(playerPos, entityPos),
      isDeadPlayer:
        entity.getType() === Entities.PLAYER && entity instanceof PlayerClient && entity.isDead(),
    };
  });

  // Sort by priority (dead players first) then by distance
  entityData.sort((a, b) => {
    // Dead players should come first
    if (a.isDeadPlayer && !b.isDeadPlayer) return -1;
    if (!a.isDeadPlayer && b.isDeadPlayer) return 1;
    // If both are dead players or both are not, sort by distance
    return a.distance - b.distance;
  });

  return entityData[0].entity;
}
