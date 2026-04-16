import {
  GAME_SERVER_API_KEY,
  GAME_SERVER_DISPLAY_NAME,
  GAME_SERVER_ID,
  GAME_SERVER_PUBLIC_WS_URL,
  GAME_SERVER_REGION,
  WEBSITE_API_URL,
} from "@/config/env";

const WEBSITE_REGISTRY_RETRY_ATTEMPTS = 10;
const WEBSITE_REGISTRY_RETRY_INITIAL_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * During deploy, the website may return HTML (404 SPA), 5xx, or stale API behavior until routes are live.
 * Do not retry permanent client errors (auth / wrong key).
 */
function isRetryableWebsiteRegistryHttpStatus(status: number): boolean {
  if (status === 401 || status === 403) {
    return false;
  }
  if (status >= 500 && status <= 599) {
    return true;
  }
  if (status === 404 || status === 408 || status === 429) {
    return true;
  }
  // Deploy race: older website build or request shape mismatch; may succeed after rollout.
  if (status === 400) {
    return true;
  }
  return false;
}

async function fetchWebsiteRegistryWithRetry(
  label: string,
  doFetch: () => Promise<Response>,
): Promise<Response> {
  for (let attempt = 0; attempt < WEBSITE_REGISTRY_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await doFetch();
      if (response.ok) {
        return response;
      }
      const canRetry =
        attempt < WEBSITE_REGISTRY_RETRY_ATTEMPTS - 1 &&
        isRetryableWebsiteRegistryHttpStatus(response.status);
      if (!canRetry) {
        return response;
      }
      const delayMs = WEBSITE_REGISTRY_RETRY_INITIAL_DELAY_MS * 2 ** attempt;
      console.warn(
        `[${label}] HTTP ${response.status} (attempt ${attempt + 1}/${WEBSITE_REGISTRY_RETRY_ATTEMPTS}), retrying in ${delayMs}ms`,
      );
      await sleep(delayMs);
    } catch (e) {
      if (attempt === WEBSITE_REGISTRY_RETRY_ATTEMPTS - 1) {
        throw e;
      }
      const delayMs = WEBSITE_REGISTRY_RETRY_INITIAL_DELAY_MS * 2 ** attempt;
      console.warn(
        `[${label}] request failed (attempt ${attempt + 1}/${WEBSITE_REGISTRY_RETRY_ATTEMPTS}), retrying in ${delayMs}ms:`,
        e instanceof Error ? e.message : e,
      );
      await sleep(delayMs);
    }
  }
  throw new Error(`[${label}] retry loop exhausted`);
}

function isConnectionRefused(error: unknown): boolean {
  const e = error as { cause?: { code?: string; errors?: Array<{ code?: string }> } };
  if (e?.cause?.code === "ECONNREFUSED") {
    return true;
  }
  const nested = e?.cause?.errors;
  return Array.isArray(nested) && nested.some((x) => x?.code === "ECONNREFUSED");
}

function websiteUnreachableMessage(): string {
  return `Cannot reach website at ${WEBSITE_API_URL} (connection refused). Start it first: cd packages/website && npm run dev — then match WEBSITE_API_URL to the URL Vite prints (often http://localhost:3000).`;
}

export function isGameServerRegistryConfigured(): boolean {
  if (!GAME_SERVER_API_KEY) {
    return false;
  }
  if (!/^\d+$/.test(GAME_SERVER_ID)) {
    return false;
  }
  return GAME_SERVER_PUBLIC_WS_URL.length > 0;
}

export function getConfiguredGameServerNumericId(): number {
  return parseInt(GAME_SERVER_ID, 10);
}

/**
 * Register (upsert) this server in the website DB so clients can discover public_ws_url.
 */
export async function registerGameServerToWebsite(listenPort: number): Promise<void> {
  if (!isGameServerRegistryConfigured()) {
    return;
  }

  const url = `${WEBSITE_API_URL}/api/game/servers/register`;
  const body = {
    id: getConfiguredGameServerNumericId(),
    publicWsUrl: GAME_SERVER_PUBLIC_WS_URL,
    listenPort,
    displayName: GAME_SERVER_DISPLAY_NAME || undefined,
    region: GAME_SERVER_REGION || undefined,
  };

  let response: Response;
  try {
    response = await fetchWebsiteRegistryWithRetry("registerGameServerToWebsite", () =>
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": GAME_SERVER_API_KEY,
        },
        body: JSON.stringify(body),
      }),
    );
  } catch (e) {
    if (isConnectionRefused(e)) {
      throw new Error(`[registerGameServerToWebsite] ${websiteUnreachableMessage()}`, { cause: e });
    }
    throw e;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `[registerGameServerToWebsite] HTTP ${response.status}: ${errText.slice(0, 400)}`,
    );
  }
}

/**
 * Clear all user session leases owned by this server id (restart / crash recovery).
 */
export async function clearServerSessionLeasesOnWebsite(serverId: string): Promise<void> {
  if (!GAME_SERVER_API_KEY) {
    return;
  }

  const url = `${WEBSITE_API_URL}/api/game/player-session`;
  let response: Response;
  try {
    response = await fetchWebsiteRegistryWithRetry("clearServerSessionLeasesOnWebsite", () =>
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": GAME_SERVER_API_KEY,
        },
        body: JSON.stringify({
          action: "clear_server_leases",
          serverId,
        }),
      }),
    );
  } catch (e) {
    if (isConnectionRefused(e)) {
      throw new Error(`[clearServerSessionLeasesOnWebsite] ${websiteUnreachableMessage()}`, {
        cause: e,
      });
    }
    throw e;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `[clearServerSessionLeasesOnWebsite] HTTP ${response.status}: ${errText.slice(0, 400)}`,
    );
  }
}

export async function heartbeatGameServerRegistryOnWebsite(listenPort: number): Promise<void> {
  if (!isGameServerRegistryConfigured()) {
    return;
  }

  const url = `${WEBSITE_API_URL}/api/game/servers/heartbeat`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": GAME_SERVER_API_KEY,
      },
      body: JSON.stringify({ id: getConfiguredGameServerNumericId() }),
    });
  } catch (e) {
    if (isConnectionRefused(e)) {
      console.warn(`[heartbeatGameServerRegistryOnWebsite] ${websiteUnreachableMessage()}`);
      return;
    }
    console.warn("[heartbeatGameServerRegistryOnWebsite] fetch failed:", e);
    return;
  }

  if (response.status === 404) {
    await registerGameServerToWebsite(listenPort);
    return;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.warn(
      `[heartbeatGameServerRegistryOnWebsite] HTTP ${response.status}: ${errText.slice(0, 300)}`,
    );
  }
}
