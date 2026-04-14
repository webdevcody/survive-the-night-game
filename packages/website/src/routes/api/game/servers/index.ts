import { createFileRoute } from "@tanstack/react-router";
import { listFreshGameServersForPublic } from "~/data-access/game-server-registry";

/**
 * Public: list worlds (game_server rows) that have heartbeated recently (for world picker + ping).
 */
export const Route = createFileRoute("/api/game/servers/")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const servers = await listFreshGameServersForPublic();
          return new Response(JSON.stringify({ servers }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          console.error("GET /api/game/servers error:", detail, error);
          return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
