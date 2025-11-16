import { Socket } from "socket.io";
import { ISocketAdapter } from "@shared/network/socket-adapter";

/**
 * Socket.IO implementation of ISocketAdapter for server-side sockets
 */
export class SocketIOSocketAdapter implements ISocketAdapter {
  constructor(private socket: Socket) {}

  emit(event: string, ...args: any[]): boolean {
    return this.socket.emit(event, ...args);
  }

  on(event: string, listener: (...args: any[]) => void): this {
    this.socket.on(event, listener);
    return this;
  }

  disconnect(close?: boolean): this {
    this.socket.disconnect(close);
    return this;
  }

  get id(): string {
    return this.socket.id ?? "";
  }

  get handshake(): {
    query: Record<string, string | string[]>;
  } {
    return {
      query: this.socket.handshake.query as Record<string, string | string[]>,
    };
  }

  /**
   * Get the underlying Socket.IO socket (for cases where direct access is needed)
   */
  getUnderlyingSocket(): Socket {
    return this.socket;
  }
}
