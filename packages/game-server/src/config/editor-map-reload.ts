/**
 * Dev/editor hook: POST reloads world-map.json from disk (same as a fresh /restart).
 * Secured with {@link GAME_SERVER_API_KEY} (header) and loopback-only in production.
 * Disable with ENABLE_EDITOR_MAP_RELOAD=false.
 */
import { GAME_SERVER_API_KEY } from "@/config/env";

export const EDITOR_WORLD_MAP_RELOAD_PATH = "/__dev/reload-world-map";

export function isEditorWorldMapReloadHttpEnabled(): boolean {
  return process.env.ENABLE_EDITOR_MAP_RELOAD !== "false";
}

export function isValidEditorMapReloadApiKey(received: string | undefined): boolean {
  const expected = GAME_SERVER_API_KEY;
  return received !== undefined && received !== "" && received === expected;
}

function isLoopbackIPv4Text(s: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) {
    return false;
  }
  const first = Number(s.split(".")[0]);
  return first === 127;
}

/**
 * True when the TCP peer is loopback (127.0.0.0/8, ::1, IPv4-mapped ::ffff:127.*).
 * Does not trust X-Forwarded-For (would be spoofable from the internet).
 */
export function isEditorMapReloadLoopbackAddress(remoteAddress: string | undefined): boolean {
  if (remoteAddress === undefined || remoteAddress === "") {
    return false;
  }
  let s = remoteAddress.trim().toLowerCase();
  if (s.startsWith("[") && s.endsWith("]")) {
    s = s.slice(1, -1);
  }
  if (s === "::1" || s === "0:0:0:0:0:0:0:1") {
    return true;
  }
  if (s.startsWith("::ffff:")) {
    return isLoopbackIPv4Text(s.slice("::ffff:".length));
  }
  return isLoopbackIPv4Text(s);
}

/**
 * In production, only loopback is allowed (cannot be overridden).
 * In non-production, set EDITOR_MAP_RELOAD_ALLOW_NON_LOCAL=true for Docker/LAN editor → host.
 */
export function isEditorMapReloadRemoteAddrAllowed(remoteAddress: string | undefined): boolean {
  if (isEditorMapReloadLoopbackAddress(remoteAddress)) {
    return true;
  }
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.EDITOR_MAP_RELOAD_ALLOW_NON_LOCAL === "true";
}

