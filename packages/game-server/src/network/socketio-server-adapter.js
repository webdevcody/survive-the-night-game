import { Server } from "socket.io";
import { SocketIOSocketAdapter } from "./socketio-socket-adapter";
/**
 * Socket.IO implementation of IServerAdapter
 */
export class SocketIOServerAdapter {
    constructor(httpServer, corsOptions) {
        this.socketAdapters = new Map();
        this.io = new Server(httpServer, {
            cors: corsOptions || {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });
        // Wrap connection event to create adapters
        this.io.on("connection", (socket) => {
            const adapter = new SocketIOSocketAdapter(socket);
            this.socketAdapters.set(socket.id, adapter);
            socket.on("disconnect", () => {
                this.socketAdapters.delete(socket.id);
            });
        });
    }
    on(event, listener) {
        if (event === "connection") {
            // Wrap connection listener to provide ISocketAdapter instead of Socket
            // Note: The adapter is already created in the constructor's connection handler
            this.io.on("connection", (socket) => {
                // Get or create adapter (should already exist from constructor handler)
                let adapter = this.socketAdapters.get(socket.id);
                if (!adapter) {
                    adapter = new SocketIOSocketAdapter(socket);
                    this.socketAdapters.set(socket.id, adapter);
                }
                listener(adapter);
            });
        }
        else {
            this.io.on(event, listener);
        }
        return this;
    }
    emit(event, ...args) {
        return this.io.emit(event, ...args);
    }
    listen(port, callback) {
        // The HTTP server is already listening, this is just for interface compliance
        if (callback) {
            callback();
        }
    }
    get sockets() {
        return {
            size: this.io.sockets.sockets.size,
            sockets: this.socketAdapters,
        };
    }
    /**
     * Get the underlying Socket.IO server (for cases where direct access is needed)
     */
    getUnderlyingServer() {
        return this.io;
    }
}
