import { createFileRoute } from "@tanstack/react-router";
import {
  getOrCreateUserStats,
  resolveHydrationAbilityAllocations,
  resolveHydrationExperience,
  resolveHydrationProfessionProgress,
} from "~/data-access/user-stats";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";
import { coercePlayerQuestState } from "@survive-the-night/game-shared/quests/player-quest-state";

const STARTER_SAVED_BANK = { items: [] as (null | unknown)[] };

const STARTER_SAVED_INVENTORY = {
  items: [
    { itemType: "torch" },
    null, null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null, null, null,
  ],
  equipment: {
    head: null,
    shoulders: null,
    torso: null,
    legs: null,
    shoes: null,
    back: null,
    hands: null,
  },
};

/**
 * Game server → website: load persisted experience for a user (hydrate Player entity on connect).
 * GET ?userId=... with X-API-Key
 *
 * Creates a user_stats row on first connect so every authenticated player has a profile.
 * New rows include a starter savedInventory (torch) so the game-server savedInventory
 * validation never sees null for a legitimate first-time player. savedBank defaults to empty.
 */
export const Route = createFileRoute("/api/game/player-experience")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authError = requireGameServerApiKey(request);
          if (authError) {
            return authError;
          }

          const url = new URL(request.url);
          const userId = url.searchParams.get("userId");
          if (!userId) {
            return new Response(JSON.stringify({ success: false, error: "Missing userId" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const stats = await getOrCreateUserStats(userId);
          const experience = resolveHydrationExperience(stats);

          return new Response(
            JSON.stringify({
              success: true,
              experience,
              zombieKills: stats.zombieKills ?? 0,
              abilityAllocations: resolveHydrationAbilityAllocations(stats),
              skillAllocations: stats.skillAllocations ?? {},
              characterAllocations: stats.characterAllocations ?? {},
              professionProgress: resolveHydrationProfessionProgress(stats),
              lastTileX: stats.lastTileX ?? null,
              lastTileY: stats.lastTileY ?? null,
              respawnTileX: stats.respawnTileX ?? null,
              respawnTileY: stats.respawnTileY ?? null,
              questProgress: coercePlayerQuestState(stats.questProgress),
              savedInventory: stats.savedInventory ?? STARTER_SAVED_INVENTORY,
              savedBank: stats.savedBank ?? STARTER_SAVED_BANK,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (error) {
          console.error("player-experience GET error:", error);
          return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
