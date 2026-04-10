import { ChatMessageEvent } from "../../../../game-shared/src/events/server-sent/events/chat-message-event";
// Maximum chat message length
const MAX_CHAT_MESSAGE_LENGTH = 500;
/**
 * Validate chat message
 * Returns sanitized message or null if invalid
 */
function validateMessage(message) {
    if (typeof message !== "string") {
        return null;
    }
    // Reject empty messages
    if (message.length === 0) {
        return null;
    }
    // Truncate overly long messages
    if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
        return message.substring(0, MAX_CHAT_MESSAGE_LENGTH);
    }
    return message;
}
export async function handleChat(context, socket, message, adminPassword) {
    const player = context.players.get(socket.id);
    if (!player)
        return;
    // Validate message
    const validatedMessage = validateMessage(message);
    if (validatedMessage === null) {
        console.warn(`Invalid chat message from socket ${socket.id}`);
        return;
    }
    // Check if it's a command
    if (validatedMessage.trim().startsWith("/")) {
        const result = await context.chatCommandRegistry.executeFromChat(validatedMessage.trim(), {
            player,
            args: [],
            entityManager: context.getEntityManager(),
            gameLoop: context.gameServer.getGameLoop(),
        }, adminPassword);
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
    const filteredMessage = context.sanitizeText(validatedMessage);
    const chatEvent = new ChatMessageEvent({
        playerId: player.getId(),
        message: filteredMessage,
    });
    context.broadcastEvent(chatEvent);
}
/**
 * Validate chat data payload
 */
function validateChatData(data) {
    if (typeof data !== "object" || data === null) {
        return null;
    }
    const obj = data;
    const message = validateMessage(obj.message);
    if (message === null) {
        return null;
    }
    const adminPassword = typeof obj.adminPassword === "string" ? obj.adminPassword : undefined;
    return { message, adminPassword };
}
export const sendChatHandler = {
    event: "SEND_CHAT",
    handler: (context, socket, data) => {
        const validated = validateChatData(data);
        if (validated === null) {
            console.warn(`Invalid chat data from socket ${socket.id}`);
            return;
        }
        handleChat(context, socket, validated.message, validated.adminPassword);
    },
};
