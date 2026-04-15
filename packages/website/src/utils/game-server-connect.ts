/** sessionStorage key for WebSocket URL chosen on /play (must match game-client). */
export const SELECTED_GAME_SERVER_WS_URL_KEY = "stn:selectedGameServerWsUrl";

export function wsPublicUrlToHealthCheckUrl(publicWsUrl: string): string {
  const u = new URL(publicWsUrl);
  const protocol = u.protocol === "wss:" ? "https:" : "http:";
  return `${protocol}//${u.host}/health`;
}

function wsPublicUrlToPublicStatusUrl(publicWsUrl: string): string {
  const u = new URL(publicWsUrl);
  const protocol = u.protocol === "wss:" ? "https:" : "http:";
  return `${protocol}//${u.host}/public-status`;
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

/** Latency (RTT) plus live player count when the game server exposes `/public-status`. */
export async function fetchGameServerWorldPickerStats(
  publicWsUrl: string,
  timeoutMs: number = 5000,
): Promise<{ pingMs: number | null; playerCount: number | null }> {
  const statusUrl = wsPublicUrlToPublicStatusUrl(publicWsUrl);
  const start = performance.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(statusUrl, { method: "GET", cache: "no-store", signal: ac.signal });
    const elapsed = Math.round(performance.now() - start);
    if (!res.ok) {
      const pingMs = await measureGameServerHealthPingMs(publicWsUrl, timeoutMs);
      return { pingMs, playerCount: null };
    }
    let playerCount: number | null = null;
    try {
      const data: unknown = await res.json();
      if (
        data &&
        typeof data === "object" &&
        typeof (data as { playerCount: unknown }).playerCount === "number" &&
        Number.isFinite((data as { playerCount: number }).playerCount)
      ) {
        playerCount = Math.max(0, Math.floor((data as { playerCount: number }).playerCount));
      }
    } catch {
      /* ignore malformed JSON */
    }
    return { pingMs: elapsed, playerCount };
  } catch {
    const pingMs = await measureGameServerHealthPingMs(publicWsUrl, timeoutMs);
    return { pingMs, playerCount: null };
  } finally {
    clearTimeout(timer);
  }
}
