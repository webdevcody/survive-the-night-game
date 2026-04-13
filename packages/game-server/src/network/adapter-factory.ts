import { IServerAdapter } from "@shared/network/server-adapter";
import { UWebSocketsServerAdapter } from "./uwebsockets-server-adapter";
import { Server as HttpServer } from "http";

/**
 * Create the game server adapter.
 */
export function createServerAdapter(
  httpServer: HttpServer,
  corsOptions?: { origin: string | string[]; methods: string[] }
): IServerAdapter {
  return new UWebSocketsServerAdapter(httpServer, corsOptions);
}

