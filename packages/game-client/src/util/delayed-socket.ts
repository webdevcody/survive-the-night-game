import { Socket } from "socket.io-client";

/**
 * Wraps a socket.io client Socket to add simulated latency to all emit calls
 */
export class DelayedSocket {
  private socket: Socket;
  private latencyMs: number;

  constructor(socket: Socket, latencyMs: number = 0) {
    this.socket = socket;
    this.latencyMs = latencyMs;
  }

  /**
   * Emit an event with simulated latency
   */
  public emit(event: string, ...args: any[]): this {
    const send = () => this.socket.emit(event, ...args);

    if (this.latencyMs > 0) {
      setTimeout(send, this.latencyMs);
    } else {
      send();
    }

    return this;
  }

  /**
   * Register an event listener (pass through to underlying socket)
   */
  public on(event: string, listener: (...args: any[]) => void): this {
    this.socket.on(event, listener);
    return this;
  }

  /**
   * Disconnect from the server (pass through to underlying socket)
   */
  public disconnect(): this {
    this.socket.disconnect();
    return this;
  }

  /**
   * Get the socket ID
   */
  public get id(): string {
    return this.socket.id;
  }

  /**
   * Get the underlying socket instance (for cases where direct access is needed)
   */
  public getUnderlyingSocket(): Socket {
    return this.socket;
  }
}
