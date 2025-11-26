import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { PlayerColor, PLAYER_COLORS } from "@shared/commands/commands";

// Cache valid player colors for efficient lookup
const VALID_PLAYER_COLORS = new Set(Object.values(PLAYER_COLORS));

/**
 * Validate change player color data
 */
function validateChangeColorData(data: unknown): { color: PlayerColor } | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Validate color - must be a valid PlayerColor
  const color = obj.color;
  if (typeof color !== "string" || !VALID_PLAYER_COLORS.has(color as PlayerColor)) {
    return null;
  }

  return { color: color as PlayerColor };
}

export function changePlayerColor(
  context: HandlerContext,
  socket: ISocketAdapter,
  payload: { color: PlayerColor }
): void {
  // Store the color for this socket ID so it can be applied when player is recreated
  context.playerColors.set(socket.id, payload.color);

  // Apply color to existing player if it exists
  const player = context.players.get(socket.id);
  if (player) {
    player.setPlayerColor(payload.color);
  }
}

export const changePlayerColorHandler: SocketEventHandler<{ color: PlayerColor }> = {
  event: "CHANGE_PLAYER_COLOR",
  handler: (context, socket, data) => {
    const validated = validateChangeColorData(data);
    if (!validated) {
      console.warn(`Invalid change player color data from socket ${socket.id}`);
      return;
    }
    changePlayerColor(context, socket, validated);
  },
};
