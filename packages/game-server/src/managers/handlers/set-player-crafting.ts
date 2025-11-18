import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "./handler-context";

export function setPlayerCrafting(
  context: HandlerContext,
  socket: ISocketAdapter,
  isCrafting: boolean
): void {
  const player = context.players.get(socket.id);
  if (!player) return;
  player.setIsCrafting(isCrafting);
}

