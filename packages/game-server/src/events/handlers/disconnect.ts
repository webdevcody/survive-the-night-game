import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { PlayerLeftEvent } from "../../../../game-shared/src/events/server-sent/events/player-left-event";
import { SocketEventHandler } from "./types";
import { IEntityManager } from "@/managers/types";
import Positionable from "@/extensions/positionable";
import { getConfig } from "@shared/config";
import { GAME_SERVER_API_KEY, WEBSITE_API_URL } from "@/config/env";

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
  const userId = context.userSessionCache.getUserIdBySocket(socket.id);

  if (userId && player && !player.isDead() && player.hasExt(Positionable) && GAME_SERVER_API_KEY) {
    const pos = player.getExt(Positionable).getPosition();
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const lastTileX = Math.floor(pos.x / TILE_SIZE);
    const lastTileY = Math.floor(pos.y / TILE_SIZE);
    const url = `${WEBSITE_API_URL}/api/game/player-last-position`;
    const bind = player.getBoundRespawnTile();
    void (async () => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": GAME_SERVER_API_KEY,
          },
          body: JSON.stringify({
            userId,
            lastTileX,
            lastTileY,
            ...(bind ? { respawnTileX: bind.x, respawnTileY: bind.y } : {}),
            characterAllocations: player.getCharacterAllocationRecord(),
          }),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          console.warn(
            `[onDisconnect] player-last-position HTTP ${res.status} for user ${userId}: ${t.slice(0, 300)}`,
          );
        }
      } catch (e) {
        console.warn(`[onDisconnect] player-last-position failed for user ${userId}:`, e);
      }
    })();
  }

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
    // #region agent log
    fetch("http://127.0.0.1:7825/ingest/2642c761-9d6c-4bd7-b4a8-ef39e8a5fbf3", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "65179d" },
      body: JSON.stringify({
        sessionId: "65179d",
        runId: "post-fix",
        hypothesisId: "H7",
        location: "disconnect.ts:isLastPlayer",
        message: "setIsGameReady(false) last socket disconnected",
        data: {},
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    context.gameServer.setIsGameReady(false);
  }
}

export const disconnectHandler: SocketEventHandler<void> = {
  event: "disconnect",
  handler: onDisconnect,
};

