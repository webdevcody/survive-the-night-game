import { createFileRoute } from "@tanstack/react-router";
import { updatePlayerStats } from "~/data-access/user-stats";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

export const Route = createFileRoute("/api/game/player-stats")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authError = requireGameServerApiKey(request);
          if (authError) {
            return authError;
          }

          const body = await request.json();
          const { userId, zombieKills } = body;

          if (!userId || typeof userId !== "string") {
            return new Response(
              JSON.stringify({ success: false, error: "Missing userId" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const stats = {
            zombieKills:
              typeof zombieKills === "number" && zombieKills >= 0
                ? zombieKills
                : 0,
          };

          const updatedStats = await updatePlayerStats(userId, stats);

          return new Response(
            JSON.stringify({
              success: true,
              zombieKills: updatedStats.zombieKills,
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
