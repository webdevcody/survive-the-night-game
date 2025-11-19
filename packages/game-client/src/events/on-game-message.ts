import { GameMessageEvent } from "../../../game-shared/src/events/server-sent/events/game-message-event";
import { ClientEventContext } from "./types";

export const onGameMessage = (context: ClientEventContext, event: GameMessageEvent) => {
  context.gameClient.getHud().addMessage(event.getMessage(), event.getColor());
};
