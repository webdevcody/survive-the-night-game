import { ChatMessageEvent } from "@shared/events/server-sent/chat-message-event";
import { ClientEventContext } from "./types";

export const onChatMessage = (context: ClientEventContext, event: ChatMessageEvent) => {
  context.gameClient
    .getHud()
    .addChatMessage(event.getPlayerId(), event.getMessage());
};

