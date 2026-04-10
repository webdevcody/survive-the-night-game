import { WEBSITE_API_URL, GAME_SERVER_API_KEY } from "@/config/env";
import { normalizeCharacterAllocations, normalizeSkillAllocations, validateCharacterAllocations, validateSkillAllocations, } from "@shared/util/progression-allocation";
async function persistSkillAllocations(userId, allocations) {
    if (!GAME_SERVER_API_KEY)
        return false;
    try {
        const res = await fetch(`${WEBSITE_API_URL}/api/game/skill-allocations`, {
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
        console.error("[setProgressionAllocations] skill persist failed", e);
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
        if (payload.kind === "skill") {
            const normalized = normalizeSkillAllocations(payload.allocations);
            const err = validateSkillAllocations(normalized, xp);
            if (err) {
                console.warn("[setProgressionAllocations] skill validation failed", err);
                return;
            }
            player.applyPersistedProgress(normalized, player.getCharacterAllocationRecord());
            const ok = await persistSkillAllocations(userId, normalized);
            if (!ok && GAME_SERVER_API_KEY) {
                console.warn("[setProgressionAllocations] skill allocations applied in-memory but website persist failed (check API key / website)");
            }
            return;
        }
        const normalized = normalizeCharacterAllocations(payload.allocations);
        const err = validateCharacterAllocations(normalized, xp);
        if (err) {
            console.warn("[setProgressionAllocations] character validation failed", err);
            return;
        }
        player.applyPersistedProgress(player.getSkillAllocationRecord(), normalized);
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
