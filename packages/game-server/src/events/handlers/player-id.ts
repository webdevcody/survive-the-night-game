import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { YourIdEvent } from "@shared/events/server-sent/events/your-id-event";

export function sendPlayerId(context: HandlerContext, socket: ISocketAdapter): void {
  const player = context.players.get(socket.id);
  if (!player) {
    console.warn(`[sendPlayerId] No player found for socket ${socket.id}`);
    return;
  }

  const gameMode = context.gameServer.getGameLoop().getGameModeStrategy().getConfig().modeId as "waves" | "battle_royale";
  const yourIdEvent = new YourIdEvent(player.getId(), gameMode);
  context.sendEventToSocket(socket, yourIdEvent);
}

export const requestPlayerIdHandler: SocketEventHandler<void> = {
  event: "REQUEST_PLAYER_ID",
  handler: sendPlayerId,
};
