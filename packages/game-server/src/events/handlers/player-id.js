import { YourIdEvent } from "@shared/events/server-sent/events/your-id-event";
export function sendPlayerId(context, socket) {
    const player = context.players.get(socket.id);
    if (!player) {
        console.warn(`[sendPlayerId] No player found for socket ${socket.id}. Players in map: ${context.players.size}`);
        // Log all socket IDs in the players map to help debug
        const socketIds = Array.from(context.players.keys());
        console.warn(`[sendPlayerId] Socket IDs in map: ${socketIds.join(", ")}`);
        return;
    }
    const gameMode = context.gameServer.getGameLoop().getGameModeStrategy().getConfig()
        .modeId;
    const yourIdEvent = new YourIdEvent(player.getId(), gameMode);
    context.sendEventToSocket(socket, yourIdEvent);
}
export const requestPlayerIdHandler = {
    event: "REQUEST_PLAYER_ID",
    handler: sendPlayerId,
};
