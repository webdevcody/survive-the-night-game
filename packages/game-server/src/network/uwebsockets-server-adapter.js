import { EDITOR_WORLD_MAP_RELOAD_PATH } from "@/config/editor-map-reload";
import { UWebSocketsSocketAdapter } from "./uwebsockets-socket-adapter";
import uWS from "uwebsockets.js";
export class UWebSocketsServerAdapter {
    constructor(httpServer, corsOptions) {
        // httpServer is not needed for uWebSockets, but kept for interface compatibility
        this.socketAdapters = new Map();
        this.connectionHandlers = [];
        this.nextSocketId = 0;
        this.wsMap = new WeakMap();
        /** Set by ServerSocketManager when editor map reload HTTP is enabled (dev). */
        this.editorReloadWorldMapHandler = null;
        // Create uWebSockets app
        this.app = uWS.App({});
        // Specific HTTP routes first (registration order matters in uWebSockets).
        this.app.post(EDITOR_WORLD_MAP_RELOAD_PATH, (res, req) => {
            res.onAborted(() => { });
            const handler = this.editorReloadWorldMapHandler;
            if (!handler) {
                res.writeStatus("404 Not Found");
                res.writeHeader("Content-Type", "text/plain");
                res.end("Not Found");
                return;
            }
            handler(res, req);
        });
        // Match f2f3448: WebSocket upgrades must not get a premature HTTP response; .ws handles them.
        this.app.any("/*", (res, req) => {
            const upgradeHeader = req.getHeader("upgrade");
            if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
                return;
            }
            res.writeStatus("404 Not Found");
            res.writeHeader("Content-Type", "text/plain");
            res.end("Not Found");
        });
        this.app.ws("/*", {
            compression: uWS.SHARED_COMPRESSOR,
            maxPayloadLength: 16 * 1024 * 1024, // 16MB
            idleTimeout: 32,
            upgrade: (res, req, context) => {
                // Extract query params from upgrade request
                let queryString = req.getQuery();
                if (!queryString) {
                    const url = req.getUrl();
                    const q = url.indexOf("?");
                    if (q !== -1) {
                        queryString = url.slice(q + 1);
                    }
                }
                const queryParams = {};
                if (queryString) {
                    const params = new URLSearchParams(queryString);
                    for (const [key, value] of params.entries()) {
                        if (queryParams[key]) {
                            const existing = queryParams[key];
                            queryParams[key] = Array.isArray(existing)
                                ? [...existing, value]
                                : [existing, value];
                        }
                        else {
                            queryParams[key] = value;
                        }
                    }
                }
                // Upgrade the connection and pass queryParams via userData
                res.upgrade({ queryParams }, req.getHeader("sec-websocket-key"), req.getHeader("sec-websocket-protocol"), req.getHeader("sec-websocket-extensions"), context);
            },
            open: (ws) => {
                // Generate unique socket ID
                const socketId = `uwebsocket_${++this.nextSocketId}_${Date.now()}`;
                // Get query params from userData (set during upgrade)
                const userData = ws.getUserData();
                const queryParams = userData.queryParams || {};
                // Create adapter
                const adapter = new UWebSocketsSocketAdapter(ws, socketId, queryParams);
                this.socketAdapters.set(socketId, adapter);
                this.wsMap.set(ws, adapter);
                // Call connection handlers
                this.connectionHandlers.forEach((handler) => {
                    try {
                        handler(adapter);
                    }
                    catch (error) {
                        console.error("Error in connection handler:", error);
                    }
                });
            },
            message: (ws, message, isBinary) => {
                const adapter = this.wsMap.get(ws);
                if (adapter) {
                    // Call handleMessage on the adapter (it's a UWebSocketsSocketAdapter)
                    adapter.handleMessage(message);
                }
            },
            close: (ws, code, message) => {
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
    on(event, listener) {
        if (event === "connection") {
            this.connectionHandlers.push(listener);
        }
        else {
            // For other events, we'd need to implement event emitters
            console.warn(`UWebSocketsServerAdapter: Event '${event}' not supported`);
        }
        return this;
    }
    emit(event, ...args) {
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
        }
        catch (error) {
            console.error("Error broadcasting event:", error);
            return false;
        }
    }
    listen(port, callback) {
        // uWebSockets listens directly on the port - no need for HTTP server
        this.app.listen(port, (token) => {
            if (token) {
                console.log(`uWebSockets listening on port ${port}`);
                if (callback) {
                    callback();
                }
            }
            else {
                console.error(`Failed to listen on port ${port}`);
            }
        });
    }
    get sockets() {
        return {
            size: this.socketAdapters.size,
            sockets: this.socketAdapters,
        };
    }
    /**
     * Get the underlying uWebSockets app instance
     */
    getUnderlyingApp() {
        return this.app;
    }
    /**
     * uWebSockets matches routes in registration order; this must be set before listen().
     */
    setEditorReloadWorldMapHandler(handler) {
        this.editorReloadWorldMapHandler = handler;
    }
}
