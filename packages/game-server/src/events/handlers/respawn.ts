import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";

export function onPlayerRespawnRequest(context: HandlerContext, socket: ISocketAdapter): void {
  const player = context.players.get(socket.id);
  if (!player) return;
  if (!player.isDead()) return;

  player.respawn();
}

export const playerRespawnRequestHandler: SocketEventHandler<void> = {
  event: "PLAYER_RESPAWN_REQUEST",
  handler: onPlayerRespawnRequest,
};
