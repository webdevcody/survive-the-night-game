import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "./handler-context";
import { PlayerLeftEvent } from "@/events/server-sent/player-left-event";

export function onDisconnect(context: HandlerContext, socket: ISocketAdapter): void {
  console.log("Player disconnected", socket.id);
  const player = context.players.get(socket.id);
  const displayName = context.playerDisplayNames.get(socket.id);

  // Clean up player and displayName
  context.players.delete(socket.id);
  context.playerDisplayNames.delete(socket.id);

  if (player) {
    // TODO: this is a hacker; I'd rather use this, but when I do there is a strange race condition where the round never restarts, so instead the
    context.getEntityManager().removeEntity(player.getId());
    // this.getEntityManager().markEntityForRemoval(player);
    context.broadcastEvent(
      new PlayerLeftEvent({
        playerId: player.getId(),
        displayName: displayName ?? "Unknown",
      })
    );
  }

  const isLastPlayer = context.players.size === 0;
  if (isLastPlayer) {
    context.gameServer.setIsGameReady(false);
  }
}
