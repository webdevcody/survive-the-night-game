import { GAME_SERVER_API_KEY, WEBSITE_API_URL } from "@/config/env";

/**
 * Claim distributed single-active-session lease (website DB). Fail closed on HTTP errors.
 */
export async function claimPlayerGameSessionToWebsite(
  userId: string,
  gameSessionId: string,
  serverInstanceId: string,
): Promise<{ ok: true } | { ok: false; reason: "active_session" | "request_failed" }> {
  if (!GAME_SERVER_API_KEY) {
    return { ok: true };
  }

  const url = `${WEBSITE_API_URL}/api/game/player-session`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": GAME_SERVER_API_KEY,
      },
      body: JSON.stringify({
        action: "claim",
        userId,
        sessionId: gameSessionId,
        serverId: serverInstanceId,
      }),
    });

    if (response.status === 409) {
      return { ok: false, reason: "active_session" };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(
        `[claimPlayerGameSessionToWebsite] HTTP ${response.status} for user ${userId}: ${errText.slice(0, 400)}`,
      );
      return { ok: false, reason: "request_failed" };
    }

    return { ok: true };
  } catch (error) {
    console.warn(`[claimPlayerGameSessionToWebsite] failed for user ${userId}:`, error);
    return { ok: false, reason: "request_failed" };
  }
}

export async function heartbeatPlayerGameSessionToWebsite(
  userId: string,
  gameSessionId: string,
): Promise<{ stillOwner: boolean }> {
  if (!GAME_SERVER_API_KEY) {
    return { stillOwner: true };
  }

  const url = `${WEBSITE_API_URL}/api/game/player-session`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": GAME_SERVER_API_KEY,
      },
      body: JSON.stringify({
        action: "heartbeat",
        userId,
        sessionId: gameSessionId,
      }),
    });

    if (!response.ok) {
      return { stillOwner: false };
    }

    const data = (await response.json()) as { stillOwner?: boolean };
    return { stillOwner: data.stillOwner !== false };
  } catch (error) {
    console.warn(`[heartbeatPlayerGameSessionToWebsite] failed for user ${userId}:`, error);
    return { stillOwner: false };
  }
}

export async function releasePlayerGameSessionToWebsite(
  userId: string,
  gameSessionId: string,
): Promise<void> {
  if (!GAME_SERVER_API_KEY) {
    return;
  }

  const url = `${WEBSITE_API_URL}/api/game/player-session`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": GAME_SERVER_API_KEY,
      },
      body: JSON.stringify({
        action: "release",
        userId,
        sessionId: gameSessionId,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(
        `[releasePlayerGameSessionToWebsite] HTTP ${response.status} for user ${userId}: ${errText.slice(0, 300)}`,
      );
    }
  } catch (error) {
    console.warn(`[releasePlayerGameSessionToWebsite] failed for user ${userId}:`, error);
  }
}
