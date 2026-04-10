import { SocketIOServerAdapter } from "./socketio-server-adapter";
import { UWebSocketsServerAdapter } from "./uwebsockets-server-adapter";
import { getConfig } from "@shared/config";
/**
 * Create the appropriate server adapter based on configuration
 */
export function createServerAdapter(httpServer, corsOptions) {
    const implementation = getConfig().network.WEBSOCKET_IMPLEMENTATION;
    if (implementation === "uwebsockets") {
        return new UWebSocketsServerAdapter(httpServer, corsOptions);
    }
    else {
        // Default to Socket.IO
        return new SocketIOServerAdapter(httpServer, corsOptions);
    }
}
