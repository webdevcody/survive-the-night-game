import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { PlayerLeftEvent } from "../../../../game-shared/src/events/server-sent/events/player-left-event";
import { SocketEventHandler } from "./types";
import { IEntityManager } from "@/managers/types";

/**
 * Count real (non-AI) players in the game
 */
function getRealPlayerCount(entityManager: IEntityManager): number {
  return entityManager
    .getPlayerEntities()
    .filter((p) => !(p as any).serialized?.get("isAI") && !p.isMarkedForRemoval())
    .length;
}

export function onDisconnect(context: HandlerContext, socket: ISocketAdapter): void {
  const player = context.players.get(socket.id);
  const displayName = context.playerDisplayNames.get(socket.id);

  // Clean up session cache for authenticated users
  context.userSessionCache.removeSocket(socket.id);

  // Clean up player, displayName, and playerColor
  context.players.delete(socket.id);
  context.playerDisplayNames.delete(socket.id);
  context.playerColors.delete(socket.id);

  if (player) {
    const playerId = player.getId();
    // Verify entity exists in entity manager before removing
    const entityManager = context.getEntityManager();
    const entityInManager = entityManager.getEntityById(playerId);
    
    if (entityInManager) {
      // TODO: this is a hacker; I'd rather use this, but when I do there is a strange race condition where the round never restarts, so instead the
      entityManager.removeEntity(playerId);
      // this.getEntityManager().markEntityForRemoval(player);
    } else {
      console.warn(`Player entity ${playerId} not found in entity manager, but removing anyway to ensure cleanup`);
      // Still call removeEntity to ensure removal is tracked and cleanup happens
      entityManager.removeEntity(playerId);
    }
    
    context.broadcastEvent(
      new PlayerLeftEvent({
        playerId: playerId,
        displayName: displayName ?? "Unknown",
      })
    );
  }

  // Adjust AI player count when real player leaves (add AI back if needed)
  // Only if not the last player (game will reset otherwise)
  if (context.players.size > 0) {
    const gameLoop = context.gameServer.getGameLoop();
    const strategy = gameLoop.getGameModeStrategy();
    const aiManager = strategy.getAIPlayerManager?.();
    if (aiManager) {
      const realPlayerCount = getRealPlayerCount(context.getEntityManager());
      aiManager.adjustAIPlayerCount(realPlayerCount);
    }

    // Ensure game mode invariants (e.g., Infection mode always has at least one zombie)
    strategy.ensureZombieExists?.(context.getGameManagers());
  }

  const isLastPlayer = context.players.size === 0;
  if (isLastPlayer) {
    context.gameServer.setIsGameReady(false);
  }
}

export const disconnectHandler: SocketEventHandler<void> = {
  event: "disconnect",
  handler: onDisconnect,
};

