import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "./handler-context";
import { ServerSentEvents } from "@shared/events/events";
import { serializeServerEvent } from "@shared/events/server-sent/server-event-serialization";

export function handlePing(
  context: HandlerContext,
  socket: ISocketAdapter,
  timestamp: number
): void {
  const binaryBuffer = serializeServerEvent(ServerSentEvents.PONG, [{ timestamp }]);
  if (binaryBuffer !== null) {
    socket.emit(ServerSentEvents.PONG, binaryBuffer);
  } else {
    console.error(`Failed to serialize ${ServerSentEvents.PONG} as binary buffer`);
  }
}
