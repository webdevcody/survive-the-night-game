import { createFileRoute } from "@tanstack/react-router";
import { touchGameServerRegistryHeartbeat } from "~/data-access/game-server-registry";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

/**
 * Game server → website: refresh last_seen for registry row.
 * POST JSON { id: number } with X-API-Key.
 */
export const Route = createFileRoute("/api/game/servers/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authError = requireGameServerApiKey(request);
          if (authError) {
            return authError;
          }

          const body = (await request.json()) as { id?: unknown };
          if (typeof body.id !== "number" || !Number.isInteger(body.id)) {
            return new Response(JSON.stringify({ success: false, error: "Missing or invalid id" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const ok = await touchGameServerRegistryHeartbeat(body.id);
          if (!ok) {
            return new Response(JSON.stringify({ success: false, error: "Unknown world id" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("POST /api/game/servers/heartbeat error:", error);
          return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
