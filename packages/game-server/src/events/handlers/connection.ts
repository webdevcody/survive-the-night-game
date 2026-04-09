import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { Player } from "@/entities/players/player";
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
 * While `onConnection` is awaiting `startNewGame()` / `resumeOpenWorldSession()`, the player
 * may not exist yet, so those handlers no-op. Always emit YOUR_ID + full state after the
 * socket's player row is guaranteed so the client cannot miss initialization.
 */
function emitSocketInitialization(context: HandlerContext, socket: ISocketAdapter): void {
  const player = context.players.get(socket.id);
  if (!player) {
    console.warn(
      `[onConnection] Cannot emit YOUR_ID/full state: no player for socket ${socket.id}`,
    );
    return;
  }
  sendPlayerId(context, socket);
  sendFullState(context, socket);
}

export async function onConnection(
  context: HandlerContext,
  socket: ISocketAdapter,
  initialProgress: PersistedPlayerProgress = defaultProgress(),
): Promise<void> {
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

    const totalPlayers = context
      .getEntityManager()
      .getPlayerEntities()
      .filter((entity) => !(entity as Player).isMarkedForRemoval()).length;

    if (totalPlayers === 0) {
      const modeId = gameLoop.getGameModeStrategy().getConfig().modeId;

      if (modeId === "open_world" && gameLoop.isOpenWorldSessionActive()) {
        await gameLoop.resumeOpenWorldSession();
      } else {
        await context.gameServer.startNewGame();
      }

      // After start/resume, verify a player exists for this socket
      let player = context.players.get(socket.id);
      if (!player) {
        // This shouldn't happen, but handle it gracefully
        console.warn(
          `[onConnection] Player for socket ${socket.id} not found after start/resume, creating one`,
        );
        player = context.createPlayerForSocket(socket, initialProgress);
        context.broadcastPlayerJoined(player);
      }

      return;
    }

    const player = context.createPlayerForSocket(socket, initialProgress);
    context.broadcastPlayerJoined(player);

    // Adjust AI player count when real player joins mid-game
    const strategy = gameLoop.getGameModeStrategy();
    const aiManager = strategy.getAIPlayerManager?.();
    if (aiManager) {
      const realPlayerCount = getRealPlayerCount(context.getEntityManager());
      aiManager.adjustAIPlayerCount(realPlayerCount);
    }

    // Ensure game mode invariants (e.g., if AI zombie was removed, pick a new zombie)
    strategy.ensureZombieExists?.(context.getGameManagers());

    // Ensure the game is ready when a human player joins
    // This handles the case where AI players exist but isGameReady was set to false
    // when the last human player disconnected
    if (!gameLoop.getIsGameReady()) {
      gameLoop.setIsGameReady(true);
    }

    // If the game is over (waiting for restart), also clear that flag so the player can play
    // This can happen if a player joins during the 5-second delay between games
    if (gameLoop.getIsGameOver()) {
      gameLoop.setIsGameOver(false);
    }
  } finally {
    emitSocketInitialization(context, socket);
  }
}
