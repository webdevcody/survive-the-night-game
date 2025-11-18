import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "./handler-context";

export function onPlayerRespawnRequest(context: HandlerContext, socket: ISocketAdapter): void {
  const player = context.players.get(socket.id);
  if (!player) return;
  if (!player.isDead()) return;

  player.respawn();
}

