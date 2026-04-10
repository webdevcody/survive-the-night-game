import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { IEntityManager } from "@/managers/types";
import type { PersistedPlayerProgress } from "@/services/player-progress-types";
import { sendFullState } from "./full-state";
import { sendPlayerId } from "./player-id";

/**
 * Count real (non-AI) players in the game
 */
function getRealPlayerCount(entityManager: IEntityManager): number {
  return entityManager
    .getPlayerEntities()
    .filter((p) => !(p as any).serialized?.get("isAI") && !p.isMarkedForRemoval()).length;
}

const defaultProgress = (): PersistedPlayerProgress => ({
  experience: 0,
  skillAllocations: {},
  characterAllocations: {},
});

/**
 * Client sends REQUEST_PLAYER_ID / REQUEST_FULL_STATE as soon as the transport connects.
 * The world is already running before any client connects; we create the player entity here
 * and always emit YOUR_ID + full state after the socket's player row exists.
 */
function emitSocketInitialization(context: HandlerContext, socket: ISocketAdapter): void {
  const player = context.players.get(socket.id);
  if (!player) {
    console.warn(`Cannot emit YOUR_ID/full state: no player for socket ${socket.id}`);
    return;
  }
  sendPlayerId(context, socket);
  sendFullState(context, socket);
}

export function onConnection(
  context: HandlerContext,
  socket: ISocketAdapter,
  initialProgress: PersistedPlayerProgress = defaultProgress(),
): void {
  try {
    const gameLoop = context.gameServer.getGameLoop();

    // Note: setupSocketListeners should be called before onConnection in ServerSocketManager

    // Check if there's already a player for this socket ID (can happen on quick reconnect)
    const existingPlayer = context.players.get(socket.id);
    if (existingPlayer) {
      // Remove the existing player entity to prevent duplicates
      context.getEntityManager().removeEntity(existingPlayer.getId());
      context.players.delete(socket.id);
    }

    const player = context.createPlayerForSocket(socket, initialProgress);
    context.broadcastPlayerJoined(player);

    const strategy = gameLoop.getGameModeStrategy();
    const aiManager = strategy.getAIPlayerManager?.();
    if (aiManager) {
      const realPlayerCount = getRealPlayerCount(context.getEntityManager());
      aiManager.adjustAIPlayerCount(realPlayerCount);
    }

    strategy.ensureZombieExists?.(context.getGameManagers());
  } finally {
    emitSocketInitialization(context, socket);
  }
}
