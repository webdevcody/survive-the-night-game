import { Server, Socket } from "socket.io";
import { IServerAdapter } from "@shared/network/server-adapter";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { SocketIOSocketAdapter } from "./socketio-socket-adapter";
import { Server as HttpServer } from "http";

/**
 * Socket.IO implementation of IServerAdapter
 */
export class SocketIOServerAdapter implements IServerAdapter {
  private io: Server;
  private socketAdapters: Map<string, ISocketAdapter> = new Map();

  constructor(
    httpServer: HttpServer,
    corsOptions?: { origin: string | string[]; methods: string[] }
  ) {
    this.io = new Server(httpServer, {
      cors: corsOptions || {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    // Wrap connection event to create adapters
    this.io.on("connection", (socket: Socket) => {
      const adapter = new SocketIOSocketAdapter(socket);
      this.socketAdapters.set(socket.id, adapter);

      socket.on("disconnect", () => {
        this.socketAdapters.delete(socket.id);
      });
    });
  }

  on(event: string, listener: (...args: any[]) => void): this {
    if (event === "connection") {
      // Wrap connection listener to provide ISocketAdapter instead of Socket
      // Note: The adapter is already created in the constructor's connection handler
      this.io.on("connection", (socket: Socket) => {
        // Get or create adapter (should already exist from constructor handler)
        let adapter = this.socketAdapters.get(socket.id);
        if (!adapter) {
          adapter = new SocketIOSocketAdapter(socket);
          this.socketAdapters.set(socket.id, adapter);
        }
        listener(adapter);
      });
    } else {
      this.io.on(event, listener);
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    return this.io.emit(event, ...args);
  }

  listen(port: number, callback?: () => void): void {
    // The HTTP server is already listening, this is just for interface compliance
    if (callback) {
      callback();
    }
  }

  get sockets(): {
    size: number;
    sockets: Map<string, ISocketAdapter>;
  } {
    return {
      size: this.io.sockets.sockets.size,
      sockets: this.socketAdapters,
    };
  }

  /**
   * Get the underlying Socket.IO server (for cases where direct access is needed)
   */
  getUnderlyingServer(): Server {
    return this.io;
  }
}
