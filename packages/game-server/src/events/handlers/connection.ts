import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { Player } from "@/entities/players/player";
import { IEntityManager } from "@/managers/types";

/**
 * Count real (non-AI) players in the game
 */
function getRealPlayerCount(entityManager: IEntityManager): number {
  return entityManager
    .getPlayerEntities()
    .filter((p) => !(p as any).serialized?.get("isAI") && !p.isMarkedForRemoval()).length;
}

export function onConnection(context: HandlerContext, socket: ISocketAdapter): void {
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
    // Start the new game (which will recreate all players including this newly connected socket)
    context.gameServer.startNewGame();

    // After startNewGame(), recreatePlayersForConnectedSockets() should have created
    // a player for all connected sockets including this one. Verify it exists.
    let player = context.players.get(socket.id);
    if (!player) {
      // This shouldn't happen, but handle it gracefully
      console.warn(
        `[onConnection] Player for socket ${socket.id} not found after startNewGame(), creating one`,
      );
      player = context.createPlayerForSocket(socket);
      context.broadcastPlayerJoined(player);
    }

    return;
  }

  const player = context.createPlayerForSocket(socket);
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
}
