import { Socket, Server } from "socket.io";

/**
 * Wraps a socket.io Server Socket to add simulated latency to all emit calls
 */
export class DelayedServerSocket {
  private socket: Socket;
  private latencyMs: number;

  constructor(socket: Socket, latencyMs: number = 0) {
    this.socket = socket;
    this.latencyMs = latencyMs;
  }

  /**
   * Emit an event with simulated latency
   */
  public emit(event: string, ...args: any[]): boolean {
    const send = () => this.socket.emit(event, ...args);

    if (this.latencyMs > 0) {
      setTimeout(send, this.latencyMs);
    } else {
      send();
    }

    return true;
  }

  /**
   * Register an event listener (pass through to underlying socket)
   */
  public on(event: string, listener: (...args: any[]) => void): this {
    this.socket.on(event, listener);
    return this;
  }

  /**
   * Disconnect the socket (pass through to underlying socket)
   */
  public disconnect(close?: boolean): this {
    this.socket.disconnect(close);
    return this;
  }

  /**
   * Get the socket ID
   */
  public get id(): string {
    return this.socket.id ?? "";
  }

  /**
   * Get handshake data
   */
  public get handshake(): Socket["handshake"] {
    return this.socket.handshake;
  }

  /**
   * Get the underlying socket instance (for cases where direct access is needed)
   */
  public getUnderlyingSocket(): Socket {
    return this.socket;
  }
}

/**
 * Wraps a socket.io Server to add simulated latency to all broadcast emit calls
 */
export class DelayedServer {
  private io: Server;
  private latencyMs: number;

  constructor(io: Server, latencyMs: number = 0) {
    this.io = io;
    this.latencyMs = latencyMs;
  }

  /**
   * Emit an event to all connected clients with simulated latency
   */
  public emit(event: string, ...args: any[]): boolean {
    const send = () => this.io.emit(event, ...args);

    if (this.latencyMs > 0) {
      setTimeout(send, this.latencyMs);
    } else {
      send();
    }

    return true;
  }

  /**
   * Register an event listener (pass through to underlying server)
   */
  public on(event: string, listener: (...args: any[]) => void): this {
    this.io.on(event, listener);
    return this;
  }

  /**
   * Get the sockets namespace
   */
  public get sockets(): Server["sockets"] {
    return this.io.sockets;
  }

  /**
   * Get the underlying server instance (for cases where direct access is needed)
   */
  public getUnderlyingServer(): Server {
    return this.io;
  }
}
