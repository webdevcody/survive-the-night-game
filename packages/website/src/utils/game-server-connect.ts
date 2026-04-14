/** sessionStorage key for WebSocket URL chosen on /play (must match game-client). */
export const SELECTED_GAME_SERVER_WS_URL_KEY = "stn:selectedGameServerWsUrl";

export function wsPublicUrlToHealthCheckUrl(publicWsUrl: string): string {
  const u = new URL(publicWsUrl);
  const protocol = u.protocol === "wss:" ? "https:" : "http:";
  return `${protocol}//${u.host}/health`;
}

export async function measureGameServerHealthPingMs(
  publicWsUrl: string,
  timeoutMs: number = 5000,
): Promise<number | null> {
  const healthUrl = wsPublicUrlToHealthCheckUrl(publicWsUrl);
  const start = performance.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(healthUrl, { method: "GET", cache: "no-store", signal: ac.signal });
    if (!res.ok) {
      return null;
    }
    return Math.round(performance.now() - start);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
