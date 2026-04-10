import { PlayerLeftEvent } from "../../../../game-shared/src/events/server-sent/events/player-left-event";
import { persistPlayerLastPositionToWebsite } from "@/services/persist-player-last-position";
/**
 * Count real (non-AI) players in the game
 */
function getRealPlayerCount(entityManager) {
    return entityManager
        .getPlayerEntities()
        .filter((p) => { var _a; return !((_a = p.serialized) === null || _a === void 0 ? void 0 : _a.get("isAI")) && !p.isMarkedForRemoval(); })
        .length;
}
export function onDisconnect(context, socket) {
    var _a, _b;
    const player = context.players.get(socket.id);
    const displayName = context.playerDisplayNames.get(socket.id);
    const userId = context.userSessionCache.getUserIdBySocket(socket.id);
    if (userId && player) {
        void persistPlayerLastPositionToWebsite(userId, player).catch((e) => {
            console.warn(`[onDisconnect] player-last-position failed for user ${userId}:`, e);
        });
    }
    // Clean up session cache for authenticated users
    context.userSessionCache.removeSocket(socket.id);
    // Clean up player, displayName, and playerColor
    context.players.delete(socket.id);
    context.playerDisplayNames.delete(socket.id);
    context.playerColors.delete(socket.id);
    if (player) {
        const playerId = player.getId();
        // Verify entity exists in entity manager before removing
        const entityManager = context.getEntityManager();
        const entityInManager = entityManager.getEntityById(playerId);
        if (entityInManager) {
            // TODO: this is a hacker; I'd rather use this, but when I do there is a strange race condition where the round never restarts, so instead the
            entityManager.removeEntity(playerId);
            // this.getEntityManager().markEntityForRemoval(player);
        }
        else {
            console.warn(`Player entity ${playerId} not found in entity manager, but removing anyway to ensure cleanup`);
            // Still call removeEntity to ensure removal is tracked and cleanup happens
            entityManager.removeEntity(playerId);
        }
        context.broadcastEvent(new PlayerLeftEvent({
            playerId: playerId,
            displayName: displayName !== null && displayName !== void 0 ? displayName : "Unknown",
        }));
    }
    // Adjust AI player count when real player leaves (add AI back if needed)
    if (context.players.size > 0) {
        const gameLoop = context.gameServer.getGameLoop();
        const strategy = gameLoop.getGameModeStrategy();
        const aiManager = (_a = strategy.getAIPlayerManager) === null || _a === void 0 ? void 0 : _a.call(strategy);
        if (aiManager) {
            const realPlayerCount = getRealPlayerCount(context.getEntityManager());
            aiManager.adjustAIPlayerCount(realPlayerCount);
        }
        // Ensure game mode invariants (e.g., Infection mode always has at least one zombie)
        (_b = strategy.ensureZombieExists) === null || _b === void 0 ? void 0 : _b.call(strategy, context.getGameManagers());
    }
}
export const disconnectHandler = {
    event: "disconnect",
    handler: onDisconnect,
};
