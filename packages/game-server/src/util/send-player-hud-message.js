/** Transient HUD line for one player (server `GameMessageEvent` → client `onGameMessage` → `Hud.addMessage`). */
export function sendPlayerHudMessage(gameManagers, playerEntityId, message, color) {
    gameManagers.getGameServer().sendGameMessageToPlayerEntity(playerEntityId, message, color);
}
