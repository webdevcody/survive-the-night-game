import { WEBSITE_API_URL, GAME_SERVER_API_KEY } from "@/config/env";
import { normalizeAbilityAllocations, normalizeCharacterAllocations, validateAbilityAllocations, validateCharacterAllocations, } from "@shared/util/progression-allocation";
async function persistAbilityAllocations(userId, allocations) {
    if (!GAME_SERVER_API_KEY)
        return false;
    try {
        const res = await fetch(`${WEBSITE_API_URL}/api/game/ability-allocations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": GAME_SERVER_API_KEY,
            },
            body: JSON.stringify({ userId, allocations }),
        });
        return res.ok;
    }
    catch (e) {
        console.error("[setProgressionAllocations] ability persist failed", e);
        return false;
    }
}
async function persistCharacterAllocations(userId, allocations) {
    if (!GAME_SERVER_API_KEY)
        return false;
    try {
        const res = await fetch(`${WEBSITE_API_URL}/api/game/character-allocations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": GAME_SERVER_API_KEY,
            },
            body: JSON.stringify({ userId, allocations }),
        });
        return res.ok;
    }
    catch (e) {
        console.error("[setProgressionAllocations] character persist failed", e);
        return false;
    }
}
export function setProgressionAllocations(context, socket, payload) {
    const player = context.players.get(socket.id);
    if (!player) {
        return;
    }
    const userId = context.userSessionCache.getUserIdBySocket(socket.id);
    if (!userId) {
        return;
    }
    const xp = player.getTotalExperience();
    void (async () => {
        if (payload.kind === "ability") {
            const normalized = normalizeAbilityAllocations(payload.allocations);
            const err = validateAbilityAllocations(normalized, xp);
            if (err) {
                console.warn("[setProgressionAllocations] ability validation failed", err);
                return;
            }
            player.applyPersistedProgress(normalized, player.getCharacterAllocationRecord(), player.getProfessionProgressRecord());
            const ok = await persistAbilityAllocations(userId, normalized);
            if (!ok && GAME_SERVER_API_KEY) {
                console.warn("[setProgressionAllocations] ability allocations applied in-memory but website persist failed (check API key / website)");
            }
            return;
        }
        const normalized = normalizeCharacterAllocations(payload.allocations);
        const err = validateCharacterAllocations(normalized, xp);
        if (err) {
            console.warn("[setProgressionAllocations] character validation failed", err);
            return;
        }
        player.applyPersistedProgress(player.getAbilityAllocationRecord(), normalized, player.getProfessionProgressRecord());
        const ok = await persistCharacterAllocations(userId, normalized);
        if (!ok && GAME_SERVER_API_KEY) {
            console.warn("[setProgressionAllocations] character allocations applied in-memory but website persist failed (check API key / website)");
        }
    })();
}
export const setProgressionAllocationsHandler = {
    event: "SET_PROGRESSION_ALLOCATIONS",
    handler: setProgressionAllocations,
};
