import { createFileRoute } from "@tanstack/react-router";
import { persistMapExplorationMerge } from "~/data-access/user-stats";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

/**
 * Game server → website: merge sparse map exploration chunks (throttled incremental saves).
 * POST JSON { userId, exploration: MapExplorationPersistedPayload } with X-API-Key.
 */
export const Route = createFileRoute("/api/game/player-map-exploration")({
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
            exploration?: unknown;
          };

          if (!body.userId || typeof body.userId !== "string") {
            return new Response(JSON.stringify({ success: false, error: "Missing userId" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (body.exploration === undefined || body.exploration === null) {
            return new Response(JSON.stringify({ success: false, error: "Missing exploration" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          try {
            const updated = await persistMapExplorationMerge(body.userId, body.exploration);
            return new Response(
              JSON.stringify({ success: true, mapExploration: updated.mapExploration ?? null }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Invalid payload";
            return new Response(JSON.stringify({ success: false, error: msg }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
        } catch (error) {
          console.error("player-map-exploration POST error:", error);
          return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
