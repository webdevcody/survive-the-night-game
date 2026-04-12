import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
type RequestCombatRollData = {
  angle: number;
};

function validateData(data: unknown): RequestCombatRollData | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const angle = (data as Record<string, unknown>).angle;
  if (typeof angle !== "number" || !Number.isFinite(angle)) {
    return null;
  }
  return { angle };
}

export function onRequestCombatRoll(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: RequestCombatRollData,
): void {
  const player = context.players.get(socket.id);
  if (!player) {
    return;
  }
  player.requestCombatRoll(data.angle);
}

export const requestCombatRollHandler: SocketEventHandler<RequestCombatRollData> = {
  event: "REQUEST_COMBAT_ROLL",
  handler: (context, socket, data) => {
    const validated = validateData(data);
    if (!validated) {
      console.warn(`Invalid combat roll request from socket ${socket.id}`);
      return;
    }
    onRequestCombatRoll(context, socket, validated);
  },
};
