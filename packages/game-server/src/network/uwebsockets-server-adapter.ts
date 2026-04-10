import { IServerAdapter } from "@shared/network/server-adapter";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { UWebSocketsSocketAdapter } from "./uwebsockets-socket-adapter";
import { Server as HttpServer } from "http";
import uWS from "uwebsockets.js";

// #region agent log
let __agentUwsInboundSeq = 0;
// #endregion

/**
 * uWebSockets implementation of IServerAdapter
 *
 * uWebSockets.js is the primary server - it handles both WebSocket and HTTP requests.
 * We don't need Express for uWebSockets since it can handle HTTP directly.
 */
interface WebSocketUserData {
  queryParams?: Record<string, string | string[]>;
}

/** uWebSockets may deliver Node Buffers or ArrayBuffer views; normalize for binary parsing. */
function normalizeWsBinaryMessage(message: unknown): ArrayBuffer {
  if (message instanceof ArrayBuffer) {
    return message;
  }
  if (typeof SharedArrayBuffer !== "undefined" && message instanceof SharedArrayBuffer) {
    const copy = new ArrayBuffer(message.byteLength);
    new Uint8Array(copy).set(new Uint8Array(message));
    return copy;
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(message)) {
    const buf = message as Buffer;
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  if (ArrayBuffer.isView(message)) {
    const v = message as ArrayBufferView;
    return v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength);
  }
  throw new TypeError(`Unexpected WebSocket message type: ${typeof message}`);
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

    // Register WebSocket routes BEFORE generic HTTP (see uWebSockets.js examples/Upgrade.js).
    // Having app.any("/*") first can steal or confuse upgrade routing so handshake query never parses.
    this.app.ws<WebSocketUserData>("/*", {
      compression: uWS.SHARED_COMPRESSOR,
      maxPayloadLength: 16 * 1024 * 1024, // 16MB
      idleTimeout: 32,
      upgrade: (res: uWS.HttpResponse, req: uWS.HttpRequest, context: uWS.us_socket_context_t) => {
        // Extract query params from upgrade request
        let queryString = req.getQuery();
        if (!queryString) {
          const url = req.getUrl();
          const q = url.indexOf("?");
          if (q !== -1) {
            queryString = url.slice(q + 1);
          }
        }
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

        // #region agent log
        fetch("http://127.0.0.1:7825/ingest/2642c761-9d6c-4bd7-b4a8-ef39e8a5fbf3", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "65179d" },
          body: JSON.stringify({
            sessionId: "65179d",
            runId: "post-fix",
            hypothesisId: "H18",
            location: "uwebsockets-server-adapter.ts:upgrade",
            message: "upgrade parsed query params",
            data: {
              url: req.getUrl(),
              queryString,
              queryKeys: Object.keys(queryParams),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

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

        // #region agent log
        fetch("http://127.0.0.1:7825/ingest/2642c761-9d6c-4bd7-b4a8-ef39e8a5fbf3", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "65179d" },
          body: JSON.stringify({
            sessionId: "65179d",
            runId: "post-fix",
            hypothesisId: "H19",
            location: "uwebsockets-server-adapter.ts:open",
            message: "open received query params",
            data: {
              socketId,
              queryKeys: Object.keys(queryParams),
              hasVersion: typeof queryParams.version === "string",
              hasGameAuthToken: typeof queryParams.gameAuthToken === "string",
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

        // Create adapter
        const adapter = new UWebSocketsSocketAdapter(ws as any, socketId, queryParams);
        this.socketAdapters.set(socketId, adapter);
        this.wsMap.set(ws, adapter);

        // #region agent log
        fetch("http://127.0.0.1:7825/ingest/2642c761-9d6c-4bd7-b4a8-ef39e8a5fbf3", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "65179d" },
          body: JSON.stringify({
            sessionId: "65179d",
            runId: "post-fix",
            hypothesisId: "H20",
            location: "uwebsockets-server-adapter.ts:open",
            message: "dispatching connection handlers",
            data: { socketId, handlerCount: this.connectionHandlers.length },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

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
          try {
            const ab = normalizeWsBinaryMessage(message);
            // Client always sends our wire format as binary frames, but some stacks report
            // isBinary=false; decoding as UTF-8 breaks event framing (see debug H3 + no H4).
            // #region agent log
            const n = ++__agentUwsInboundSeq;
            if (n <= 25) {
              const u8 = new Uint8Array(ab);
              fetch("http://127.0.0.1:7825/ingest/2642c761-9d6c-4bd7-b4a8-ef39e8a5fbf3", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "65179d" },
                body: JSON.stringify({
                  sessionId: "65179d",
                  runId: "post-fix",
                  hypothesisId: "H-MSG-RX",
                  location: "uwebsockets-server-adapter.ts:message",
                  message: "inbound ws frame",
                  data: {
                    n,
                    isBinary,
                    byteLength: ab.byteLength,
                    byte0: u8.length ? u8[0] : null,
                  },
                  timestamp: Date.now(),
                }),
              }).catch(() => {});
            }
            // #endregion
            (adapter as UWebSocketsSocketAdapter).handleMessage(ab);
          } catch (e) {
            console.error("[uWS] Failed to normalize/dispatch message:", e);
          }
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

    // Non-WebSocket HTTP on this port (WebSocket upgrades are handled by .ws above).
    this.app.any("/*", (res: uWS.HttpResponse, _req: uWS.HttpRequest) => {
      res.writeStatus("404 Not Found");
      res.writeHeader("Content-Type", "text/plain");
      res.end("Not Found");
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
