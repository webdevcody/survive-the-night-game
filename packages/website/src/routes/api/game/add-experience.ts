import { createFileRoute } from "@tanstack/react-router";
import { privateEnv } from "~/config/privateEnv";
import { addExperience } from "~/data-access/user-stats";

export const Route = createFileRoute("/api/game/add-experience")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = request.headers.get("X-API-Key");
          if (!apiKey || apiKey !== privateEnv.GAME_SERVER_API_KEY) {
            return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (!privateEnv.GAME_SERVER_API_KEY) {
            console.error("GAME_SERVER_API_KEY not configured");
            return new Response(
              JSON.stringify({ success: false, error: "Server configuration error" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
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
