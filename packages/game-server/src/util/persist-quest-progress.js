import { UserSessionCache } from "@/services/user-session-cache";
import { GAME_SERVER_API_KEY, WEBSITE_API_URL } from "@/config/env";
/**
 * Writes quest journal to the website DB when progress changes in-game.
 * Authenticated players only; fire-and-forget.
 */
export function queuePersistQuestProgressToWebsite(player) {
    if (!GAME_SERVER_API_KEY) {
        return;
    }
    const socketId = player.getClientSocketId();
    if (!socketId) {
        return;
    }
    const userId = UserSessionCache.getInstance().getUserIdBySocket(socketId);
    if (!userId) {
        return;
    }
    const questProgress = player.getQuestProgressPayload();
    const url = `${WEBSITE_API_URL}/api/game/player-quest-progress`;
    void (async () => {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": GAME_SERVER_API_KEY,
                },
                body: JSON.stringify({ userId, questProgress }),
            });
            if (!res.ok) {
                const t = await res.text().catch(() => "");
                console.warn(`[quest-progress] HTTP ${res.status} for user ${userId}: ${t.slice(0, 300)}`);
            }
        }
        catch (e) {
            console.warn(`[quest-progress] failed for user ${userId}:`, e);
        }
    })();
}
