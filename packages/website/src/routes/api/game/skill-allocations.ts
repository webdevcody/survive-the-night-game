import { createFileRoute } from "@tanstack/react-router";
import { setSkillAllocations } from "~/data-access/user-stats";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

/**
 * Game server → website: persist skill allocation map (full replace). POST with X-API-Key.
 */
export const Route = createFileRoute("/api/game/skill-allocations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authError = requireGameServerApiKey(request);
          if (authError) {
            return authError;
          }

          const body = (await request.json()) as { userId?: string; allocations?: unknown };
          const userId = body.userId;
          if (!userId || typeof userId !== "string") {
            return new Response(JSON.stringify({ success: false, error: "Missing userId" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const result = await setSkillAllocations(userId, body.allocations ?? {});
          if (result.ok === false) {
            return new Response(JSON.stringify({ success: false, error: result.error }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(
            JSON.stringify({
              success: true,
              skillAllocations: result.stats.skillAllocations,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (error) {
          console.error("skill-allocations POST error:", error);
          return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
