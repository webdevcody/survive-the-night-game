import { createFileRoute } from "@tanstack/react-router";
import { updateQuestProgressOnly } from "~/data-access/user-stats";
import { coercePlayerQuestState } from "@survive-the-night/game-shared/quests/player-quest-state";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

/**
 * Game server → website: save quest journal when a step completes or a quest finishes.
 * POST JSON { userId, questProgress } with X-API-Key.
 */
export const Route = createFileRoute("/api/game/player-quest-progress")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authError = requireGameServerApiKey(request);
          if (authError) {
            return authError;
          }

          const body = (await request.json()) as {
            userId?: unknown;
            questProgress?: unknown;
          };

          if (!body.userId || typeof body.userId !== "string") {
            return new Response(JSON.stringify({ success: false, error: "Missing userId" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (body.questProgress === undefined || body.questProgress === null) {
            return new Response(JSON.stringify({ success: false, error: "Missing questProgress" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const questProgress = coercePlayerQuestState(body.questProgress);
          const updated = await updateQuestProgressOnly(body.userId, questProgress);

          return new Response(
            JSON.stringify({
              success: true,
              questProgress: coercePlayerQuestState(updated.questProgress),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (error) {
          console.error("player-quest-progress POST error:", error);
          return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
