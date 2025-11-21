import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "./handler-context";
import { ServerSentEvents } from "@shared/events/events";
import { ChatMessageEvent } from "../../../../game-shared/src/events/server-sent/events/chat-message-event";
import { serializeServerEvent } from "@shared/events/server-sent/server-event-serialization";
import { EntityManager } from "@/managers/entity-manager";

export async function handleChat(
  context: HandlerContext,
  socket: ISocketAdapter,
  message: string
): Promise<void> {
  const player = context.players.get(socket.id);
  if (!player) return;

  // Check if it's a command
  if (message.trim().startsWith("/")) {
    const result = await context.chatCommandRegistry.executeFromChat(message.trim(), {
      player,
      args: [],
      entityManager: context.getEntityManager() as EntityManager,
    });

    // If command returned a message, send it as a system message
    if (result) {
      const chatEvent = new ChatMessageEvent({
        playerId: 0, // System message uses ID 0
        message: result,
      });
      const chatData = chatEvent.getData();
      const chatBuffer = serializeServerEvent(ServerSentEvents.CHAT_MESSAGE, [chatData]);
      if (chatBuffer !== null) {
        socket.emit(ServerSentEvents.CHAT_MESSAGE, chatBuffer);
      } else {
        console.error(`Failed to serialize ${ServerSentEvents.CHAT_MESSAGE} as binary buffer`);
      }
    }
    return;
  }

  // Regular chat message - filter bad words and replace with asterisks
  const filteredMessage = context.sanitizeText(message);
  const chatEvent = new ChatMessageEvent({
    playerId: player.getId(),
    message: filteredMessage,
  });

  context.broadcastEvent(chatEvent);
}
