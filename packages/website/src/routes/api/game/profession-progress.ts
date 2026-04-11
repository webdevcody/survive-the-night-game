import { createFileRoute } from "@tanstack/react-router";
import { setProfessionProgress } from "~/data-access/user-stats";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

export const Route = createFileRoute("/api/game/profession-progress")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authError = requireGameServerApiKey(request);
          if (authError) {
            return authError;
          }

          const body = (await request.json()) as { userId?: string; progress?: unknown };
          const userId = body.userId;
          if (!userId || typeof userId !== "string") {
            return new Response(JSON.stringify({ success: false, error: "Missing userId" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const result = await setProfessionProgress(userId, body.progress ?? {});
          if (result.ok === false) {
            return new Response(JSON.stringify({ success: false, error: result.error }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(
            JSON.stringify({
              success: true,
              professionProgress: result.stats.professionProgress,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (error) {
          console.error("profession-progress POST error:", error);
          return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
