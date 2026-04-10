/**
 * After saving world-map.json, ask the game server to run the same flow as /restart so
 * `generateMap()` reloads the file and connected clients get a fresh map.
 *
 * Set NOTIFY_GAME_SERVER_ON_MAP_SAVE=false to skip. Uses GAME_SERVER_BASE_URL (default
 * http://localhost:3001) and GAME_SERVER_API_KEY (must match the game server).
 *
 * Note: Map *expansion* changes MAP_SIZE in source; the running server cannot pick that
 * up without a process restart — only ordinary saves are notified here.
 */
import { EDITOR_WORLD_MAP_RELOAD_PATH } from "./editor-reload-constants.js";

export type NotifyGameServerMapReloadResult =
  | { ok: true; skipped: true }
  | { ok: true; skipped?: false; status: number }
  | { ok: false; error: string; status?: number };

export async function notifyGameServerMapReload(): Promise<NotifyGameServerMapReloadResult> {
  if (process.env.NOTIFY_GAME_SERVER_ON_MAP_SAVE === "false") {
    console.log("[biome-editor-server] NOTIFY_GAME_SERVER_ON_MAP_SAVE=false — skipping game server reload");
    return { ok: true, skipped: true };
  }
  const base = (process.env.GAME_SERVER_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
  const key = process.env.GAME_SERVER_API_KEY ?? "abc123";
  const url = `${base}${EDITOR_WORLD_MAP_RELOAD_PATH}`;
  console.log(`[biome-editor-server] Notifying game server map reload: POST ${url}`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-game-server-api-key": key },
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn(
        `[biome-editor-server] Game server map reload failed: HTTP ${res.status} — ${text.slice(0, 300)}`,
      );
      return { ok: false, error: text.slice(0, 200) || `HTTP ${res.status}`, status: res.status };
    }
    console.log(`[biome-editor-server] Game server map reload OK (HTTP ${res.status})`);
    return { ok: true, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[biome-editor-server] Game server map reload request failed: ${msg}`);
    return { ok: false, error: msg };
  }
}
