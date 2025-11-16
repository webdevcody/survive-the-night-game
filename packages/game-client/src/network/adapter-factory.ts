import { IClientAdapter } from "@shared/network/client-adapter";
import { SocketIOClientAdapter } from "./socketio-client-adapter";
import { UWebSocketsClientAdapter } from "./uwebsockets-client-adapter";
import { getConfig } from "@shared/config";

/**
 * Create the appropriate client adapter based on configuration
 */
export function createClientAdapter(): IClientAdapter {
  const implementation = getConfig().network.WEBSOCKET_IMPLEMENTATION;

  if (implementation === "uwebsockets") {
    return new UWebSocketsClientAdapter();
  } else {
    // Default to Socket.IO
    return new SocketIOClientAdapter();
  }
}

