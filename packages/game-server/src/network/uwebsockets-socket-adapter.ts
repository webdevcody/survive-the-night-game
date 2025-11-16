import { ISocketAdapter } from "@shared/network/socket-adapter";
import { BufferReader } from "@shared/util/buffer-serialization";
import { deserializeClientEvent } from "@shared/events/client-sent/client-event-serialization";
import { eventTypeRegistry } from "@shared/util/event-type-encoding";
import { TextDecoder } from "util";

const textDecoder = new TextDecoder();

/**
 * uWebSockets WebSocket type (from uWebSockets.js)
 */
type UWebSocket = {
  send: (message: ArrayBuffer | string, isBinary?: boolean, compress?: boolean) => number;
  close: () => void;
  getRemoteAddressAsText: () => ArrayBuffer;
  getRemoteAddress: () => ArrayBuffer;
  getRemoteAddressAsBinary: () => ArrayBuffer;
  subscribe: (topic: string) => boolean;
  unsubscribe: (topic: string) => boolean;
  publish: (
    topic: string,
    message: ArrayBuffer | string,
    isBinary?: boolean,
    compress?: boolean
  ) => boolean;
  isSubscribed: (topic: string) => boolean;
  getBufferedAmount: () => number;
  getRemoteAddressAsLong: () => bigint;
  cork: (cb: () => void) => void;
  end: (code?: number, shortMessage?: ArrayBuffer) => void;
  ping: () => void;
  getUserData: () => any;
  setUserData: (data: any) => void;
};

/**
 * uWebSockets implementation of ISocketAdapter for server-side sockets
 */
export class UWebSocketsSocketAdapter implements ISocketAdapter {
  private eventHandlers: Map<string, Array<(...args: any[]) => void>> = new Map();
  private socketId: string;
  private handshakeQuery: Record<string, string | string[]> = {};

  constructor(
    private ws: UWebSocket,
    socketId: string,
    queryParams?: Record<string, string | string[]>
  ) {
    this.socketId = socketId;
    if (queryParams) {
      this.handshakeQuery = queryParams;
    }
  }

  emit(event: string, ...args: any[]): boolean {
    try {
      // If first argument is a Buffer, prepend event type ID and send as binary
      if (args.length > 0 && Buffer.isBuffer(args[0])) {
        // Encode event type to uint8
        const eventTypeId = eventTypeRegistry.encode(event as any);
        const eventTypeBuffer = Buffer.allocUnsafe(1);
        eventTypeBuffer.writeUInt8(eventTypeId, 0);
        // Combine: [eventTypeId (1 byte)][bufferData]
        const combinedBuffer = Buffer.concat([eventTypeBuffer, args[0]]);
        // Convert to ArrayBuffer for uWebSockets
        // Create a new ArrayBuffer by copying the buffer data to ensure correct format
        const arrayBuffer = combinedBuffer.buffer.slice(
          combinedBuffer.byteOffset,
          combinedBuffer.byteOffset + combinedBuffer.byteLength
        );
        const result = this.ws.send(arrayBuffer, true); // Send as binary
        return result === 1; // 1 = success in uWebSockets
      }
      // Otherwise, serialize as JSON
      const message = JSON.stringify({ event, args });
      const result = this.ws.send(message, false);
      return result === 1; // 1 = success in uWebSockets
    } catch (error) {
      console.error("Error emitting event:", error);
      return false;
    }
  }

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(listener);
    return this;
  }

  /**
   * Trigger registered handlers for an internally generated event
   */
  public triggerEvent(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) {
      return;
    }
    handlers.forEach((handler) => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Handle incoming message from uWebSockets
   * This is called by the server adapter when a message is received
   */
  handleMessage(message: ArrayBuffer | string): void {
    try {
      if (message instanceof ArrayBuffer) {
        try {
          const reader = new BufferReader(message);
          // Read event type ID (1 byte)
          const eventTypeId = reader.readUInt8();
          const eventName = eventTypeRegistry.decode(eventTypeId);
          const payload = message.slice(reader.getOffset());

          const handlers = this.eventHandlers.get(eventName);
          if (handlers) {
            let handlerArgs: any[] | null = null;
            try {
              handlerArgs = deserializeClientEvent(eventName, payload);
            } catch (error) {
              console.error(`Error deserializing client event ${eventName}:`, error);
              handlerArgs = null;
            }

            handlers.forEach((handler) => {
              try {
                if (handlerArgs) {
                  handler(...handlerArgs);
                } else if (payload.byteLength > 0) {
                  handler(payload);
                } else {
                  handler();
                }
              } catch (error) {
                console.error(`Error in event handler for ${eventName}:`, error);
              }
            });
          }
          return;
        } catch (binaryError) {
          // Fallback to JSON parsing if binary decoding fails
          try {
            const messageStr = textDecoder.decode(message);
            const parsed = JSON.parse(messageStr);
            this.dispatchJsonMessage(parsed.event, parsed.args);
            return;
          } catch (jsonError) {
            console.error("Failed to parse incoming message:", binaryError);
            return;
          }
        }
      }

      // String message fallback (JSON)
      const messageStr = typeof message === "string" ? message : textDecoder.decode(message);
      const parsed = JSON.parse(messageStr);
      this.dispatchJsonMessage(parsed.event, parsed.args);
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  private dispatchJsonMessage(event: string, args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) {
      return;
    }
    const normalizedArgs = Array.isArray(args) ? args : args !== undefined ? [args] : [];
    handlers.forEach((handler) => {
      try {
        handler(...normalizedArgs);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  disconnect(close?: boolean): this {
    try {
      if (close) {
        this.ws.end(1000); // Normal closure
      } else {
        this.ws.close();
      }
    } catch (error) {
      console.error("Error disconnecting socket:", error);
    }
    return this;
  }

  get id(): string {
    return this.socketId;
  }

  get handshake(): {
    query: Record<string, string | string[]>;
  } {
    return {
      query: this.handshakeQuery,
    };
  }

  /**
   * Get the underlying uWebSockets WebSocket instance
   */
  getUnderlyingSocket(): UWebSocket {
    return this.ws;
  }
}
