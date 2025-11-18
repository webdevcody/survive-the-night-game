import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { Input } from "@shared/util/input";
import { SocketEventHandler } from "./types";

export function onPlayerInput(context: HandlerContext, socket: ISocketAdapter, input: Input): void {
  const player = context.players.get(socket.id);
  if (!player) return;
  player.setInput(input);
}

export const playerInputHandler: SocketEventHandler<Input> = {
  event: "PLAYER_INPUT",
  handler: onPlayerInput,
};
