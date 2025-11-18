import { ChatMessageEvent } from "../../../game-shared/src/events/server-sent/events/chat-message-event";
import { ClientEventContext } from "./types";

export const onChatMessage = (context: ClientEventContext, event: ChatMessageEvent) => {
  context.gameClient.getHud().addChatMessage(event.getPlayerId(), event.getMessage());
};
