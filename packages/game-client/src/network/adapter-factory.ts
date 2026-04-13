import { IClientAdapter } from "@shared/network/client-adapter";
import { UWebSocketsClientAdapter } from "./uwebsockets-client-adapter";

/**
 * Create the game client adapter.
 */
export function createClientAdapter(): IClientAdapter {
  return new UWebSocketsClientAdapter();
}

