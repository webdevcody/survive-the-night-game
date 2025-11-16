import { Socket } from "socket.io-client";
import { ISocketAdapter } from "@shared/network/socket-adapter";

/**
 * Socket.IO implementation of ISocketAdapter for client-side sockets
 */
export class SocketIOSocketAdapter implements ISocketAdapter {
  constructor(private socket: Socket) {}

  emit(event: string, ...args: any[]): this {
    this.socket.emit(event, ...args);
    return this;
  }

  on(event: string, listener: (...args: any[]) => void): this {
    this.socket.on(event, listener);
    return this;
  }

  disconnect(): this {
    this.socket.disconnect();
    return this;
  }

  get id(): string {
    return this.socket.id ?? "";
  }

  get handshake(): {
    query: Record<string, string | string[]>;
  } {
    // Client sockets don't have handshake in the same way, return empty query
    return {
      query: {},
    };
  }

  /**
   * Get the underlying Socket.IO socket (for cases where direct access is needed)
   */
  getUnderlyingSocket(): Socket {
    return this.socket;
  }
}
