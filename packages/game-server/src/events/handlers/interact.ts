import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import Placeable from "@/extensions/placeable";
import { getConfig } from "@shared/config";
import { distance } from "@shared/util/physics";
import { Entities } from "@/constants";
import { Player } from "@/entities/players/player";
import { SocketEventHandler } from "./types";
import { IEntity } from "@/entities/types";

/**
 * Validate interact data
 */
function validateInteractData(
  data: unknown
): { targetEntityId?: number | null } | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Validate targetEntityId - optional, but if present must be a finite non-negative integer or null
  const targetEntityId = obj.targetEntityId;
  if (targetEntityId !== undefined && targetEntityId !== null) {
    if (
      typeof targetEntityId !== "number" ||
      !Number.isFinite(targetEntityId) ||
      !Number.isInteger(targetEntityId) ||
      targetEntityId < 0
    ) {
      return null;
    }
    return { targetEntityId };
  }

  return { targetEntityId: targetEntityId as null | undefined };
}

export function onInteract(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { targetEntityId?: number | null }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  // Cache position and radius once
  const playerPos = player.getCenterPosition();
  const maxRadius = getConfig().player.MAX_INTERACT_RADIUS;

  const entityManager = player.getEntityManager();

  const attemptInteract = (entity: IEntity | null | undefined) => {
    if (!entity || !entity.hasExt(Interactive) || !entity.hasExt(Positionable)) {
      return false;
    }

    const entityPos = entity.getExt(Positionable).getCenterPosition();
    if (distance(playerPos, entityPos) > maxRadius) {
      return false;
    }

    entity.getExt(Interactive).interact(player.getId());
    return true;
  };

  // If client specified a target entity, prioritize it
  if (data.targetEntityId !== undefined && data.targetEntityId !== null) {
    const targetEntity = entityManager.getEntityById(data.targetEntityId);
    if (attemptInteract(targetEntity)) {
      return;
    }
    // If the targeted entity is invalid or out of range, fall through to fallback logic
    console.log(`[Interact] Target entity ${data.targetEntityId} failed interaction check (exists: ${!!targetEntity})`);
  }

  // Get nearby entities (already filtered by distance in getNearbyEntities)
  const entities = entityManager.getNearbyEntities(playerPos, maxRadius).filter((entity) => entity.hasExt(Interactive));

  if (entities.length === 0) {
    return;
  }

  // Pre-calculate distances and dead player flags to avoid repeated calculations
  const entityData = entities.map((entity) => {
    const entityPos = entity.getExt(Positionable).getCenterPosition();
    return {
      entity,
      distance: distance(playerPos, entityPos),
      isDeadPlayer: entity.getType() === Entities.PLAYER && (entity as Player).isDead(),
      isPlaceable: entity.hasExt(Placeable),
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

  // Get the closest entity (already filtered and sorted)
  const closestEntity = entityData[0];

  attemptInteract(closestEntity.entity);
}

export const interactHandler: SocketEventHandler<{ targetEntityId?: number | null }> = {
  event: "INTERACT",
  handler: (context, socket, data) => {
    const validated = validateInteractData(data);
    if (!validated) {
      console.warn(`Invalid interact data from socket ${socket.id}`);
      return;
    }
    onInteract(context, socket, validated);
  },
};

