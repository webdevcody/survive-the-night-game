import { createFileRoute } from "@tanstack/react-router";
import {
  getOrCreateUserStats,
  resolveHydrationAbilityAllocations,
  resolveHydrationExperience,
  resolveHydrationProfessionProgress,
} from "~/data-access/user-stats";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";
import { coercePlayerQuestState } from "@survive-the-night/game-shared/quests/player-quest-state";

/**
 * Game server → website: load persisted experience for a user (hydrate Player entity on connect).
 * GET ?userId=... with X-API-Key
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
              savedInventory: stats.savedInventory ?? null,
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
