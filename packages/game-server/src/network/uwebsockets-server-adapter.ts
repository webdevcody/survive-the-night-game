import { IServerAdapter } from "@shared/network/server-adapter";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { UWebSocketsSocketAdapter } from "./uwebsockets-socket-adapter";
import { Server as HttpServer } from "http";
import uWS from "uwebsockets.js";

/**
 * uWebSockets implementation of IServerAdapter
 *
 * uWebSockets.js is the primary server - it handles both WebSocket and HTTP requests.
 * We don't need Express for uWebSockets since it can handle HTTP directly.
 */
interface WebSocketUserData {
  queryParams?: Record<string, string | string[]>;
}

export class UWebSocketsServerAdapter implements IServerAdapter {
  private app: uWS.TemplatedApp;
  private socketAdapters: Map<string, ISocketAdapter> = new Map();
  private connectionHandlers: Array<(socket: ISocketAdapter) => void> = [];
  private nextSocketId: number = 0;
  private wsMap: WeakMap<uWS.WebSocket<WebSocketUserData>, ISocketAdapter> = new WeakMap();

  constructor(
    httpServer: HttpServer | null,
    corsOptions?: { origin: string | string[]; methods: string[] }
  ) {
    // httpServer is not needed for uWebSockets, but kept for interface compatibility

    // Create uWebSockets app
    this.app = uWS.App({});

    // Intercept upgrade requests to capture query params
    this.app.any("/*", (res: uWS.HttpResponse, req: uWS.HttpRequest) => {
      const upgradeHeader = req.getHeader("upgrade");
      if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
        // This is a WebSocket upgrade - we'll handle it in the ws() handler
        // The ws() handler will be called automatically by uWebSockets
        return;
      }

      // Non-WebSocket HTTP requests
      res.writeStatus("404 Not Found");
      res.writeHeader("Content-Type", "text/plain");
      res.end("Not Found");
    });

    this.app.ws<WebSocketUserData>("/*", {
      compression: uWS.SHARED_COMPRESSOR,
      maxPayloadLength: 16 * 1024 * 1024, // 16MB
      idleTimeout: 32,
      upgrade: (res: uWS.HttpResponse, req: uWS.HttpRequest, context: uWS.us_socket_context_t) => {
        // Extract query params from upgrade request
        const queryString = req.getQuery();
        const queryParams: Record<string, string | string[]> = {};
        if (queryString) {
          const params = new URLSearchParams(queryString);
          for (const [key, value] of params.entries()) {
            if (queryParams[key]) {
              const existing = queryParams[key];
              queryParams[key] = Array.isArray(existing)
                ? [...existing, value]
                : [existing as string, value];
            } else {
              queryParams[key] = value;
            }
          }
        }

        // Upgrade the connection and pass queryParams via userData
        res.upgrade(
          { queryParams },
          req.getHeader("sec-websocket-key"),
          req.getHeader("sec-websocket-protocol"),
          req.getHeader("sec-websocket-extensions"),
          context
        );
      },
      open: (ws: uWS.WebSocket<WebSocketUserData>) => {
        // Generate unique socket ID
        const socketId = `uwebsocket_${++this.nextSocketId}_${Date.now()}`;

        // Get query params from userData (set during upgrade)
        const userData = ws.getUserData();
        const queryParams = userData.queryParams || {};

        // Create adapter
        const adapter = new UWebSocketsSocketAdapter(ws as any, socketId, queryParams);
        this.socketAdapters.set(socketId, adapter);
        this.wsMap.set(ws, adapter);

        // Call connection handlers
        this.connectionHandlers.forEach((handler) => {
          try {
            handler(adapter);
          } catch (error) {
            console.error("Error in connection handler:", error);
          }
        });
      },
      message: (ws: uWS.WebSocket<WebSocketUserData>, message: ArrayBuffer, isBinary: boolean) => {
        const adapter = this.wsMap.get(ws);
        if (adapter) {
          // Call handleMessage on the adapter (it's a UWebSocketsSocketAdapter)
          (adapter as any).handleMessage(message);
        }
      },
      close: (ws: uWS.WebSocket<WebSocketUserData>, code: number, message: ArrayBuffer) => {
        const adapter = this.wsMap.get(ws);
        if (adapter) {
          this.socketAdapters.delete(adapter.id);
          this.wsMap.delete(ws);
          // Notify listeners about the disconnect so server logic can clean up
          if (adapter instanceof UWebSocketsSocketAdapter) {
            adapter.triggerEvent("disconnect");
          }
        }
      },
    });
  }

  on(event: string, listener: (...args: any[]) => void): this {
    if (event === "connection") {
      this.connectionHandlers.push(listener as (socket: ISocketAdapter) => void);
    } else {
      // For other events, we'd need to implement event emitters
      console.warn(`UWebSocketsServerAdapter: Event '${event}' not supported`);
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    try {
      // Broadcast to all connected sockets using their emit methods
      // This allows each adapter to handle buffers correctly
      let successCount = 0;
      this.socketAdapters.forEach((adapter) => {
        if (adapter.emit(event, ...args)) {
          successCount++;
        }
      });

      return successCount > 0;
    } catch (error) {
      console.error("Error broadcasting event:", error);
      return false;
    }
  }

  listen(port: number, callback?: () => void): void {
    // uWebSockets listens directly on the port - no need for HTTP server
    this.app.listen(port, (token: uWS.us_listen_socket | false) => {
      if (token) {
        console.log(`uWebSockets listening on port ${port}`);
        if (callback) {
          callback();
        }
      } else {
        console.error(`Failed to listen on port ${port}`);
      }
    });
  }

  get sockets(): {
    size: number;
    sockets: Map<string, ISocketAdapter>;
  } {
    return {
      size: this.socketAdapters.size,
      sockets: this.socketAdapters,
    };
  }

  /**
   * Get the underlying uWebSockets app instance
   */
  getUnderlyingApp(): uWS.TemplatedApp {
    return this.app;
  }
}
