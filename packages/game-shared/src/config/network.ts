/**
 * ========================================================================
 * NETWORK CONFIGURATION
 * ========================================================================
 *
 * Controls network behavior.
 * ========================================================================
 */

export type WebSocketImplementation = "socketio" | "uwebsockets";

const getWebSocketImplementation = (): WebSocketImplementation => {
  // Check environment variable first (server-side)
  if (typeof process !== "undefined" && process.env.WEBSOCKET_IMPLEMENTATION) {
    const impl = process.env.WEBSOCKET_IMPLEMENTATION.toLowerCase();
    if (impl === "socketio" || impl === "uwebsockets") {
      return impl;
    }
  }
  // Default to socketio for backward compatibility
  return "uwebsockets"; //"socketio";
};

export const networkConfig = {
  /**
   * WebSocket implementation to use: "socketio" or "uwebsockets"
   * Can be overridden via WEBSOCKET_IMPLEMENTATION environment variable
   */
  WEBSOCKET_IMPLEMENTATION: getWebSocketImplementation(),
} as const;

export type NetworkConfig = typeof networkConfig;
