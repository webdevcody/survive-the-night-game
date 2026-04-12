import { ClientSentEvents } from "@shared/events/events";
function validateData(data) {
    if (typeof data !== "object" || data === null) {
        return null;
    }
    const angle = data.angle;
    if (typeof angle !== "number" || !Number.isFinite(angle)) {
        return null;
    }
    return { angle };
}
export function onRequestCombatRoll(context, socket, data) {
    const player = context.players.get(socket.id);
    if (!player) {
        return;
    }
    player.requestCombatRoll(data.angle);
}
export const requestCombatRollHandler = {
    event: ClientSentEvents.REQUEST_COMBAT_ROLL,
    handler: (context, socket, data) => {
        const validated = validateData(data);
        if (!validated) {
            console.warn(`Invalid combat roll request from socket ${socket.id}`);
            return;
        }
        onRequestCombatRoll(context, socket, validated);
    },
};
