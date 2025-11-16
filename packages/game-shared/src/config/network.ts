/**
 * ========================================================================
 * NETWORK CONFIGURATION
 * ========================================================================
 *
 * Controls network behavior and simulation.
 * ========================================================================
 */

const NONE_NETWORK_LATENCY_MS = 0;
const FASTEST_NETWORK_LATENCY_MS = 25;
const FAST_NETWORK_LATENCY_MS = 50;
const SLOW_NETWORK_LATENCY_MS = 100;
const SLOWEST_NETWORK_LATENCY_MS = 150;

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
   * Simulated network latency in milliseconds
   */
  SIMULATED_LATENCY_MS: NONE_NETWORK_LATENCY_MS,

  /**
   * WebSocket implementation to use: "socketio" or "uwebsockets"
   * Can be overridden via WEBSOCKET_IMPLEMENTATION environment variable
   */
  WEBSOCKET_IMPLEMENTATION: getWebSocketImplementation(),
} as const;

export type NetworkConfig = typeof networkConfig;
