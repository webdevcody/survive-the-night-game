import { GAME_SERVER_API_KEY, WEBSITE_API_URL } from "@/config/env";
/**
 * Persist a positive experience delta to the website DB (game server API key).
 * Fire-and-forget; same endpoint as zombie-kill XP.
 */
export function queuePersistExperienceDeltaToWebsite(userId, delta) {
    if (!GAME_SERVER_API_KEY || delta <= 0) {
        return;
    }
    void fetch(`${WEBSITE_API_URL}/api/game/add-experience`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": GAME_SERVER_API_KEY,
        },
        body: JSON.stringify({ userId, experienceDelta: delta }),
    })
        .then(async (response) => {
        if (!response.ok) {
            const text = await response.text();
            console.error(`add-experience failed for user ${userId}: ${response.status} ${text}`);
        }
    })
        .catch((error) => {
        console.error(`add-experience request failed for user ${userId}:`, error);
    });
}
