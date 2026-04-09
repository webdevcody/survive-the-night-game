import { createFileRoute } from "@tanstack/react-router";
import { incrementZombieKills } from "~/data-access/user-stats";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

export const Route = createFileRoute("/api/game/zombie-kill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authError = requireGameServerApiKey(request);
          if (authError) {
            return authError;
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
