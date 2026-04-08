import { createFileRoute } from "@tanstack/react-router";
import { privateEnv } from "~/config/privateEnv";
import { getOrCreateUserStats } from "~/data-access/user-stats";

/**
 * Game server → website: load persisted experience for a user (hydrate Player entity on connect).
 * GET ?userId=... with X-API-Key
 */
export const Route = createFileRoute("/api/game/player-experience")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const apiKey = request.headers.get("X-API-Key");
          if (!apiKey || apiKey !== privateEnv.GAME_SERVER_API_KEY) {
            return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (!privateEnv.GAME_SERVER_API_KEY) {
            return new Response(
              JSON.stringify({ success: false, error: "Server configuration error" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
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

          return new Response(
            JSON.stringify({ success: true, experience: stats.experience }),
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
