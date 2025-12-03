import { createFileRoute } from "@tanstack/react-router";
import { privateEnv } from "~/config/privateEnv";
import { updatePlayerStats } from "~/data-access/user-stats";

export const Route = createFileRoute("/api/game/player-stats")({
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
          const { userId, zombieKills, wavesCompleted, maxWave } = body;

          if (!userId || typeof userId !== "string") {
            return new Response(
              JSON.stringify({ success: false, error: "Missing userId" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // Normalize values - default to 0 if not provided
          const stats = {
            zombieKills:
              typeof zombieKills === "number" && zombieKills >= 0
                ? zombieKills
                : 0,
            wavesCompleted:
              typeof wavesCompleted === "number" && wavesCompleted >= 0
                ? wavesCompleted
                : 0,
            maxWave:
              typeof maxWave === "number" && maxWave >= 0 ? maxWave : 0,
          };

          const updatedStats = await updatePlayerStats(userId, stats);

          return new Response(
            JSON.stringify({
              success: true,
              zombieKills: updatedStats.zombieKills,
              wavesCompleted: updatedStats.wavesCompleted,
              maxWave: updatedStats.maxWave,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (error) {
          console.error("Player stats tracking error:", error);
          return new Response(
            JSON.stringify({ success: false, error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
