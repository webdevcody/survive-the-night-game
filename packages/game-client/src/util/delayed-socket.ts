import { ISocketAdapter } from "@shared/network/socket-adapter";
import { ClientSentEvents, type ClientSentEventType } from "@shared/events/events";
import { serializeClientEvent } from "@shared/events/client-sent/client-event-serialization";

const CLIENT_EVENT_VALUES = new Set<string>(Object.values(ClientSentEvents));

/**
 * Wraps a socket adapter to add simulated latency to all emit calls
 * and automatically decode payloads received from the server
 */
export class DelayedSocket {
  private socket: ISocketAdapter;
  private latencyMs: number;

  constructor(socket: ISocketAdapter, latencyMs: number = 0) {
    this.socket = socket;
    this.latencyMs = latencyMs;
  }

  /**
   * Emit an event with simulated latency
   */
  public emit(event: string, ...args: any[]): this {
    let payloadArgs = args;
    if (CLIENT_EVENT_VALUES.has(event as ClientSentEventType)) {
      const buffer = serializeClientEvent(event, args);
      if (buffer !== null) {
        payloadArgs = [buffer];
      }
    }

    const send = () => this.socket.emit(event, ...payloadArgs);

    if (this.latencyMs > 0) {
      setTimeout(send, this.latencyMs);
    } else {
      send();
    }

    return this;
  }

  /**
   * Register an event listener with automatic payload decoding
   */
  public on(event: string, listener: (...args: any[]) => void): this {
    this.socket.on(event, (...args: any[]) => {
      listener(...args);
    });
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
    return this.socket.id ?? "";
  }

  /**
   * Get the underlying socket adapter instance (for cases where direct access is needed)
   */
  public getUnderlyingSocket(): ISocketAdapter {
    return this.socket;
  }
}
