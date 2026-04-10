import { PongEvent } from "../../../../game-shared/src/events/server-sent/events/pong-event";
export function handlePing(context, socket, timestamp) {
    const pongEvent = new PongEvent({ timestamp });
    context.sendEventToSocket(socket, pongEvent);
}
export function handlePingUpdate(context, socket, latency) {
    // Update player's ping with the latency calculated by the client
    // This ensures accurate ping calculation without clock skew issues
    const player = context.players.get(socket.id);
    if (player) {
        // Ensure latency is non-negative (sanity check)
        player.setPing(Math.max(0, latency));
    }
}
export const pingHandler = {
    event: "PING",
    handler: handlePing,
};
export const pingUpdateHandler = {
    event: "PING_UPDATE",
    handler: handlePingUpdate,
};
