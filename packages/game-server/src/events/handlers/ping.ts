import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { ServerSentEvents } from "@shared/events/events";
import { serializeServerEvent } from "@shared/events/server-sent/server-event-serialization";

export function handlePing(context: HandlerContext, socket: ISocketAdapter, timestamp: number): void {
  const delayedSocket = context.wrapSocket(socket);
  const binaryBuffer = serializeServerEvent(ServerSentEvents.PONG, [{ timestamp }]);
  delayedSocket.emit(ServerSentEvents.PONG, binaryBuffer);
}

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

