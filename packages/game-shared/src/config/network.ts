/**
 * ========================================================================
 * NETWORK CONFIGURATION
 * ========================================================================
 *
 * Controls network behavior.
 * ========================================================================
 */

export type WebSocketImplementation = "uwebsockets";

export const networkConfig = {
  /**
   * WebSocket implementation used by the game transport layer.
   */
  WEBSOCKET_IMPLEMENTATION: "uwebsockets" as WebSocketImplementation,
} as const;

export type NetworkConfig = typeof networkConfig;
