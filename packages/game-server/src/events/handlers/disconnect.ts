import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { PlayerLeftEvent } from "../../../../game-shared/src/events/server-sent/events/player-left-event";
import { SocketEventHandler } from "./types";

export function onDisconnect(context: HandlerContext, socket: ISocketAdapter): void {
  console.log("Player disconnected", socket.id);
  const player = context.players.get(socket.id);
  const displayName = context.playerDisplayNames.get(socket.id);

  // Clean up player and displayName
  context.players.delete(socket.id);
  context.playerDisplayNames.delete(socket.id);

  if (player) {
    const playerId = player.getId();
    // Verify entity exists in entity manager before removing
    const entityManager = context.getEntityManager();
    const entityInManager = entityManager.getEntityById(playerId);
    
    if (entityInManager) {
      console.log(`Removing player entity ${playerId} from entity manager`);
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

  const isLastPlayer = context.players.size === 0;
  if (isLastPlayer) {
    context.gameServer.setIsGameReady(false);
  }
}

export const disconnectHandler: SocketEventHandler<void> = {
  event: "disconnect",
  handler: onDisconnect,
};

