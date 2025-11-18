import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "./handler-context";

export function handlePingUpdate(
  context: HandlerContext,
  socket: ISocketAdapter,
  latency: number
): void {
  // Update player's ping with the latency calculated by the client
  // This ensures accurate ping calculation without clock skew issues
  const player = context.players.get(socket.id);
  if (player) {
    // Ensure latency is non-negative (sanity check)
    player.setPing(Math.max(0, latency));
  }
}
