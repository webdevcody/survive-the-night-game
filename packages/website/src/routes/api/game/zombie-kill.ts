import { createFileRoute } from "@tanstack/react-router";
import { privateEnv } from "~/config/privateEnv";
import { incrementZombieKills } from "~/data-access/user-stats";

export const Route = createFileRoute("/api/game/zombie-kill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Verify API key
          const apiKey = request.headers.get("X-API-Key");
          if (!apiKey || apiKey !== privateEnv.GAME_SERVER_API_KEY) {
            return new Response(
              JSON.stringify({ success: false, error: "Unauthorized" }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }

          // Check if API key is configured
          if (!privateEnv.GAME_SERVER_API_KEY) {
            console.error("GAME_SERVER_API_KEY not configured");
            return new Response(
              JSON.stringify({
                success: false,
                error: "Server configuration error",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          const body = await request.json();
          const { userId, killCount } = body;

          if (!userId || typeof userId !== "string") {
            return new Response(
              JSON.stringify({ success: false, error: "Missing userId" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const count =
            typeof killCount === "number" && killCount > 0 ? killCount : 1;

          const stats = await incrementZombieKills(userId, count);

          return new Response(
            JSON.stringify({
              success: true,
              zombieKills: stats.zombieKills,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (error) {
          console.error("Zombie kill tracking error:", error);
          return new Response(
            JSON.stringify({ success: false, error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
