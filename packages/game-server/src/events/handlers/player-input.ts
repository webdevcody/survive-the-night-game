import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { Input } from "@shared/util/input";

export function onPlayerInput(context: HandlerContext, socket: ISocketAdapter, input: Input): void {
  const player = context.players.get(socket.id);
  if (!player) return;
  player.setInput(input);
}

