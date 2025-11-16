import { GameState } from "@/state";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientInteractive, ClientPositionable } from "@/extensions";
import { getPlayer } from "@/util/get-player";
import { distance } from "../../../game-shared/src/util/physics";
import { getConfig } from "@shared/config";
import { Entities } from "@shared/constants";
import { PlayerClient } from "@/entities/player";

/**
 * Finds the closest interactive entity to the player.
 * Uses the same logic as the server-side interaction handling.
 */
export function getClosestInteractiveEntity(
  gameState: GameState
): ClientEntityBase | null {
  const player = getPlayer(gameState);
  if (!player || !player.hasExt(ClientPositionable)) {
    return null;
  }

  const playerPos = player.getExt(ClientPositionable).getCenterPosition();
  const maxRadius = getConfig().player.MAX_INTERACT_RADIUS;

  // Get all interactive entities within range
  const interactiveEntities = gameState.entities.filter((entity) => {
    if (!(entity instanceof ClientEntityBase)) return false;
    if (!entity.hasExt(ClientInteractive)) return false;
    if (!entity.hasExt(ClientPositionable)) return false;
    if (entity.getId() === player.getId()) return false;

    const entityPos = entity.getExt(ClientPositionable).getCenterPosition();
    return distance(playerPos, entityPos) <= maxRadius;
  }) as ClientEntityBase[];

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
        entity.getType() === Entities.PLAYER &&
        (entity as PlayerClient).isDead(),
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

