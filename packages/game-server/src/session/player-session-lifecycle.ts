/**
 * Central place for player socket ↔ entity session orchestration.
 * Connect/disconnect handlers delegate here so lifecycle policy is not scattered.
 */
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "@/events/context";
import { PlayerLeftEvent } from "../../../game-shared/src/events/server-sent/events/player-left-event";
import { persistPlayerLastPositionToWebsite } from "@/services/persist-player-last-position";
import { sendFullState } from "@/events/handlers/full-state";
import { sendPlayerId } from "@/events/handlers/player-id";
import type { IEntityManager } from "@/managers/types";

/** Real (non-AI) connected players still in the entity manager, excluding pending removals. */
export function countRealHumanPlayers(entityManager: IEntityManager): number {
  return entityManager
    .getPlayerEntities()
    .filter((p) => !p.isAIControlled() && !p.isMarkedForRemoval()).length;
}

/**
 * Send YOUR_ID then full state after the socket row exists in context.players.
 * Server push is the authoritative first init on connect / after map reload.
 */
export function emitInitializationForSocket(context: HandlerContext, socket: ISocketAdapter): void {
  const player = context.players.get(socket.id);
  if (!player) {
    console.warn(`Cannot emit YOUR_ID/full state: no player for socket ${socket.id}`);
    return;
  }
  sendPlayerId(context, socket);
  sendFullState(context, socket);
}

/**
 * Remove duplicate entity when the same socket connects again before the old row was torn down.
 */
export function removeExistingPlayerEntityForSocket(
  context: HandlerContext,
  socket: ISocketAdapter,
): void {
  const existing = context.players.get(socket.id);
  if (!existing) {
    return;
  }
  context.getEntityManager().despawnEntity(existing.getId(), "immediate");
  context.players.delete(socket.id);
}

/** After a new player entity is created: AI fill and mode invariants. */
export function afterHumanPlayerJoinedSession(context: HandlerContext): void {
  const gameLoop = context.gameServer.getGameLoop();
  const strategy = gameLoop.getGameModeStrategy();
  const aiManager = strategy.getAIPlayerManager?.();
  if (aiManager) {
    aiManager.adjustAIPlayerCount(countRealHumanPlayers(context.getEntityManager()));
  }
  strategy.ensureZombieExists?.(context.getGameManagers());
}

/**
 * Full disconnect teardown: persist, session cache, socket maps, entity despawn, broadcast, post-hooks.
 */
export function performPlayerDisconnect(context: HandlerContext, socket: ISocketAdapter): void {
  const player = context.players.get(socket.id);
  const displayName = context.playerDisplayNames.get(socket.id);
  const userId = context.userSessionCache.getUserIdBySocket(socket.id);

  if (userId && player) {
    void persistPlayerLastPositionToWebsite(userId, player).catch((e) => {
      console.warn(`[performPlayerDisconnect] player-last-position failed for user ${userId}:`, e);
    });
  }

  context.userSessionCache.removeSocket(socket.id);
  context.players.delete(socket.id);
  context.playerDisplayNames.delete(socket.id);
  context.playerColors.delete(socket.id);

  if (player) {
    const playerId = player.getId();
    const entityManager = context.getEntityManager();
    const entityInManager = entityManager.getEntityById(playerId);

    if (!entityInManager) {
      console.warn(
        `Player entity ${playerId} not found in entity manager; despawn still tracked for replication`,
      );
    }

    // Immediate despawn: clients must see removal on the next tick; deferred path is for timed despawns.
    entityManager.despawnEntity(playerId, "immediate");

    context.broadcastEvent(
      new PlayerLeftEvent({
        playerId,
        displayName: displayName ?? "Unknown",
      }),
    );
  }

  if (context.players.size > 0) {
    afterHumanPlayerJoinedSession(context);
  }
}
