import { PongEvent } from "@shared/events/server-sent/pong-event";
import { ClientEventContext } from "./types";

export const onPong = (context: ClientEventContext, event: PongEvent) => {
  // The event is already deserialized by the socket manager's attachHandler
  // Both Date.now() and timestamp are Unix timestamps (milliseconds since epoch, UTC)
  // This calculation is timezone-independent
  const latency = Date.now() - event.getData().timestamp;

  // Send calculated latency to server so it can update the player's ping
  // This ensures accurate ping calculation without clock skew issues
  context.socketManager.sendPingUpdate(latency);
};

