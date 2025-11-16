import { IClientAdapter, IClientConnectionOptions } from "@shared/network/client-adapter";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { UWebSocketsSocketAdapter } from "./uwebsockets-socket-adapter";

/**
 * uWebSockets client implementation using native WebSocket API
 */
export class UWebSocketsClientAdapter implements IClientAdapter {
  private connectionHandlers: Array<(socket: ISocketAdapter) => void> = [];
  private disconnectHandlers: Array<(socket: ISocketAdapter) => void> = [];
  private nextSocketId: number = 0;

  connect(url: string, options?: IClientConnectionOptions): ISocketAdapter {
    // Convert Socket.IO URL format to WebSocket URL format
    // e.g., "http://localhost:3001" -> "ws://localhost:3001"
    let wsUrl = url;
    if (wsUrl.startsWith("http://")) {
      wsUrl = wsUrl.replace("http://", "ws://");
    } else if (wsUrl.startsWith("https://")) {
      wsUrl = wsUrl.replace("https://", "wss://");
    } else if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) {
      // Default to ws:// if no protocol specified
      wsUrl = `ws://${wsUrl}`;
    }

    // Generate unique socket ID
    const socketId = `uwebsocket_client_${++this.nextSocketId}_${Date.now()}`;

    // Parse query parameters from URL
    const urlObj = new URL(wsUrl);
    const queryParams: Record<string, string | string[]> = {};
    urlObj.searchParams.forEach((value, key) => {
      if (queryParams[key]) {
        const existing = queryParams[key];
        queryParams[key] = Array.isArray(existing) ? [...existing, value] : [existing as string, value];
      } else {
        queryParams[key] = value;
      }
    });

    // Create WebSocket connection
    const ws = new WebSocket(wsUrl);

    // Create adapter
    const adapter = new UWebSocketsSocketAdapter(ws, socketId, queryParams);

    // Set up connection handler
    ws.onopen = () => {
      this.connectionHandlers.forEach((handler) => {
        try {
          handler(adapter);
        } catch (error) {
          console.error("Error in connection handler:", error);
        }
      });
    };

    // Set up disconnect handler
    ws.onclose = () => {
      this.disconnectHandlers.forEach((handler) => {
        try {
          handler(adapter);
        } catch (error) {
          console.error("Error in disconnect handler:", error);
        }
      });
    };

    return adapter;
  }

  on(event: "connect" | "disconnect", listener: (socket: ISocketAdapter) => void): this {
    if (event === "connect") {
      this.connectionHandlers.push(listener);
    } else if (event === "disconnect") {
      this.disconnectHandlers.push(listener);
    }
    return this;
  }
}

