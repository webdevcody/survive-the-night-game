import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { PlayerColor, PLAYER_COLORS } from "@shared/commands/commands";

export function changePlayerColor(
  context: HandlerContext,
  socket: ISocketAdapter,
  payload: { color: PlayerColor }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  // Validate that the color is a valid PlayerColor
  const validColors = Object.values(PLAYER_COLORS);
  if (!validColors.includes(payload.color)) {
    console.error("Invalid player color:", payload.color);
    return;
  }

  player.setPlayerColor(payload.color);
}

export const changePlayerColorHandler: SocketEventHandler<{ color: PlayerColor }> = {
  event: "CHANGE_PLAYER_COLOR",
  handler: (context, socket, data) => changePlayerColor(context, socket, data),
};
