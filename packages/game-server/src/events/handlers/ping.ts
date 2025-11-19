import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { PongEvent } from "../../../../game-shared/src/events/server-sent/events/pong-event";
import { SocketEventHandler } from "./types";

export function handlePing(
  context: HandlerContext,
  socket: ISocketAdapter,
  timestamp: number
): void {
  const pongEvent = new PongEvent({ timestamp });
  context.sendEventToSocket(socket, pongEvent);
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

export const pingHandler: SocketEventHandler<number> = {
  event: "PING",
  handler: handlePing,
};

export const pingUpdateHandler: SocketEventHandler<number> = {
  event: "PING_UPDATE",
  handler: handlePingUpdate,
};
