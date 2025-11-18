import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { ChatMessageEvent } from "../../../../game-shared/src/events/server-sent/events/chat-message-event";
import { EntityManager } from "@/managers/entity-manager";
import { SocketEventHandler } from "./types";

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
      context.sendEventToSocket(socket, chatEvent);
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

export const sendChatHandler: SocketEventHandler<{ message: string }> = {
  event: "SEND_CHAT",
  handler: (context, socket, data) => handleChat(context, socket, data.message),
};
