import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "./handler-context";
import { ServerSentEvents } from "@shared/events/events";
import { serializeServerEvent } from "@shared/events/server-sent/server-event-serialization";

export function handlePing(
  context: HandlerContext,
  socket: ISocketAdapter,
  timestamp: number
): void {
  const delayedSocket = context.wrapSocket(socket);
  const binaryBuffer = serializeServerEvent(ServerSentEvents.PONG, [{ timestamp }]);
  delayedSocket.emit(ServerSentEvents.PONG, binaryBuffer);
}
