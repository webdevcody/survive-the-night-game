import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "./handler-context";
import { Input } from "../../../../game-shared/src/util/input";

export function onPlayerInput(context: HandlerContext, socket: ISocketAdapter, input: Input): void {
  const player = context.players.get(socket.id);
  if (!player) return;
  player.setInput(input);
}

