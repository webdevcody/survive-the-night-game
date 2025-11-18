import { GameMessageEvent } from "@shared/events/server-sent/game-message-event";
import { ClientEventContext } from "./types";

export const onGameMessage = (context: ClientEventContext, event: GameMessageEvent) => {
  context.gameClient.getHud().addMessage(event.getMessage(), event.getColor());
};

