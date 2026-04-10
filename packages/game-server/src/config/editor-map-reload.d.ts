export declare const EDITOR_WORLD_MAP_RELOAD_PATH = "/__dev/reload-world-map";
export declare function isEditorWorldMapReloadHttpEnabled(): boolean;
export declare function isValidEditorMapReloadApiKey(received: string | undefined): boolean;
/**
 * True when the TCP peer is loopback (127.0.0.0/8, ::1, IPv4-mapped ::ffff:127.*).
 * Does not trust X-Forwarded-For (would be spoofable from the internet).
 */
export declare function isEditorMapReloadLoopbackAddress(remoteAddress: string | undefined): boolean;
/**
 * In production, only loopback is allowed (cannot be overridden).
 * In non-production, set EDITOR_MAP_RELOAD_ALLOW_NON_LOCAL=true for Docker/LAN editor → host.
 */
export declare function isEditorMapReloadRemoteAddrAllowed(remoteAddress: string | undefined): boolean;
