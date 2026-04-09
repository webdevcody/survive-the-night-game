import { privateEnv } from "~/config/privateEnv";

/**
 * Validates X-API-Key for game-server → website routes.
 * Must check that the env key is configured **before** comparing, otherwise an empty
 * `GAME_SERVER_API_KEY` on the website makes `apiKey !== ""` always true → 401 for every request.
 */
export function requireGameServerApiKey(request: Request): Response | null {
  if (!privateEnv.GAME_SERVER_API_KEY) {
    console.error("GAME_SERVER_API_KEY not configured on website");
    return new Response(
      JSON.stringify({ success: false, error: "Server configuration error: GAME_SERVER_API_KEY missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey || apiKey !== privateEnv.GAME_SERVER_API_KEY) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}
