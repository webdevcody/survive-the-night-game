import { auth } from "~/utils/auth";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/session/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { sessionToken } = body;

          if (!sessionToken || typeof sessionToken !== "string") {
            return new Response(
              JSON.stringify({ valid: false, error: "Missing session token" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // Create headers with the session token as a cookie
          // This allows us to use better-auth's getSession method
          const headers = new Headers();
          headers.set("Cookie", `better-auth.session_token=${sessionToken}`);

          const session = await auth.api.getSession({ headers });

          if (!session || !session.user) {
            return new Response(
              JSON.stringify({
                valid: false,
                error: "Invalid or expired session",
              }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }

          // Check if session is expired
          if (session.session.expiresAt < new Date()) {
            return new Response(
              JSON.stringify({ valid: false, error: "Session expired" }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({
              valid: true,
              userId: session.user.id,
              userName: session.user.name,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (error) {
          console.error("Session validation error:", error);
          return new Response(
            JSON.stringify({ valid: false, error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
