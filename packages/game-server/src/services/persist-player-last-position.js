import Positionable from "@/extensions/positionable";
import { getConfig } from "@shared/config";
import { GAME_SERVER_API_KEY, WEBSITE_API_URL } from "@/config/env";
import PoolManager from "@shared/util/pool-manager";
export function getPersistablePlayerLastTile(player) {
    if (!player.hasExt(Positionable)) {
        return null;
    }
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const center = player.getCenterPosition();
    const lastTileX = Math.floor(center.x / TILE_SIZE);
    const lastTileY = Math.floor(center.y / TILE_SIZE);
    const restoredPosition = player
        .getGameManagers()
        .getMapManager()
        .tryGetPositionForSavedTile(lastTileX, lastTileY);
    if (!restoredPosition) {
        return null;
    }
    PoolManager.getInstance().vector2.release(restoredPosition);
    return { x: lastTileX, y: lastTileY };
}
/**
 * Writes the player's current tile and optional campsite bind to the website DB
 * (same contract as disconnect).
 */
export async function persistPlayerLastPositionToWebsite(userId, player) {
    if (!GAME_SERVER_API_KEY) {
        return;
    }
    if (!player.isHydratedFromDb()) {
        return;
    }
    if (player.isDead() || !player.hasExt(Positionable)) {
        return;
    }
    const lastTile = getPersistablePlayerLastTile(player);
    if (!lastTile) {
        console.warn(`[persistPlayerLastPositionToWebsite] skipping invalid last tile for user ${userId}`);
        return;
    }
    const bind = player.getBoundRespawnTile();
    const url = `${WEBSITE_API_URL}/api/game/player-last-position`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": GAME_SERVER_API_KEY,
        },
        body: JSON.stringify(Object.assign(Object.assign({ userId, lastTileX: lastTile.x, lastTileY: lastTile.y }, (bind ? { respawnTileX: bind.x, respawnTileY: bind.y } : {})), { characterAllocations: player.getCharacterAllocationRecord(), abilityAllocations: player.getAbilityAllocationRecord(), professionProgress: player.getProfessionProgressRecord(), savedInventory: player.getSavedInventoryPayload() })),
    });
    if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.warn(`[persistPlayerLastPositionToWebsite] HTTP ${res.status} for user ${userId}: ${t.slice(0, 300)}`);
    }
}
