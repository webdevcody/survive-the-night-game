import { createFileRoute } from "@tanstack/react-router";
import { addExperience } from "~/data-access/user-stats";
import { requireGameServerApiKey } from "~/utils/game-server-api-auth";

export const Route = createFileRoute("/api/game/add-experience")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authError = requireGameServerApiKey(request);
          if (authError) {
            return authError;
          }

          const body = await request.json();
          const { userId, experienceDelta } = body;

          if (!userId || typeof userId !== "string") {
            return new Response(JSON.stringify({ success: false, error: "Missing userId" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const delta =
            typeof experienceDelta === "number" && experienceDelta >= 0
              ? Math.floor(experienceDelta)
              : 0;

          const updated = await addExperience(userId, delta);

          return new Response(
            JSON.stringify({
              success: true,
              experience: updated.experience,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (error) {
          console.error("Add experience error:", error);
          return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
