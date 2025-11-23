import { GameMessageEvent } from "../../../game-shared/src/events/server-sent/events/game-message-event";
import { ServerSentEvents } from "@shared/events/events";
import { ClientEventContext } from "./types";
import { onThunderstormStart } from "./on-thunderstorm-start";
import { onThunderstormEnd } from "./on-thunderstorm-end";

export const onGameMessage = (context: ClientEventContext, event: GameMessageEvent) => {
  const message = event.getMessage()?.toLowerCase() || "";

  // Check if this is a thunderstorm event by message content
  // Server sends "A thunderstorm is approaching!" or "The thunderstorm has passed!"
  if (
    message.includes("thunderstorm is approaching") ||
    message.includes("thunderstorm approaching")
  ) {
    console.log("[GameMessage] Detected thunderstorm start event");
    onThunderstormStart(context, event);
    return;
  }

  if (message.includes("thunderstorm has passed") || message.includes("thunderstorm passed")) {
    console.log("[GameMessage] Detected thunderstorm end event");
    onThunderstormEnd(context, event);
    return;
  }

  // Default behavior: show message
  context.gameClient.getHud().addMessage(event.getMessage(), event.getColor());
};
