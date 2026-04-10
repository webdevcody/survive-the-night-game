import Positionable from "@/extensions/positionable";
import { getConfig } from "@shared/config";
import { GAME_SERVER_API_KEY, WEBSITE_API_URL } from "@/config/env";
/**
 * Writes the player's current tile and optional campsite bind to the website DB
 * (same contract as disconnect).
 */
export async function persistPlayerLastPositionToWebsite(userId, player) {
    if (!GAME_SERVER_API_KEY) {
        return;
    }
    if (player.isDead() || !player.hasExt(Positionable)) {
        return;
    }
    const pos = player.getExt(Positionable).getPosition();
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const lastTileX = Math.floor(pos.x / TILE_SIZE);
    const lastTileY = Math.floor(pos.y / TILE_SIZE);
    const bind = player.getBoundRespawnTile();
    const url = `${WEBSITE_API_URL}/api/game/player-last-position`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": GAME_SERVER_API_KEY,
        },
        body: JSON.stringify(Object.assign(Object.assign({ userId,
            lastTileX,
            lastTileY }, (bind ? { respawnTileX: bind.x, respawnTileY: bind.y } : {})), { characterAllocations: player.getCharacterAllocationRecord(), skillAllocations: player.getSkillAllocationRecord(), savedInventory: player.getSavedInventoryPayload() })),
    });
    if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.warn(`[persistPlayerLastPositionToWebsite] HTTP ${res.status} for user ${userId}: ${t.slice(0, 300)}`);
    }
}
