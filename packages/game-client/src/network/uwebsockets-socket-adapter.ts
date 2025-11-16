import { ISocketAdapter } from "@shared/network/socket-adapter";
import { BufferReader } from "@shared/util/buffer-serialization";
import { eventTypeRegistry } from "@shared/util/event-type-encoding";

const textEncoder = new TextEncoder();

/**
 * uWebSockets client implementation using native WebSocket API
 */
export class UWebSocketsSocketAdapter implements ISocketAdapter {
  private eventHandlers: Map<string, Array<(...args: any[]) => void>> = new Map();
  private socketId: string;
  private handshakeQuery: Record<string, string | string[]> = {};

  constructor(
    private ws: WebSocket,
    socketId: string,
    queryParams?: Record<string, string | string[]>
  ) {
    this.socketId = socketId;
    if (queryParams) {
      this.handshakeQuery = queryParams;
    }

    // Set up WebSocket event handlers
    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data);
    };

    this.ws.onerror = (error: Event) => {
      const handlers = this.eventHandlers.get("error");
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(error);
          } catch (err) {
            console.error("Error in error handler:", err);
          }
        });
      }
    };
  }

  emit(event: string, ...args: any[]): this {
    try {
      if (this.ws.readyState === WebSocket.OPEN) {
        if (args.length > 0 && (args[0] instanceof ArrayBuffer || ArrayBuffer.isView(args[0]))) {
          const raw = args[0];
          const payloadView = raw instanceof ArrayBuffer
            ? new Uint8Array(raw)
            : new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);

          // Encode event type to uint8
          const eventTypeId = eventTypeRegistry.encode(event as any);
          const combined = new Uint8Array(1 + payloadView.length);
          combined[0] = eventTypeId;
          combined.set(payloadView, 1);
          this.ws.send(combined.buffer);
        } else {
          // Fallback to JSON serialization for compatibility
          const message = JSON.stringify({ event, args });
          this.ws.send(message);
        }
      } else {
        console.warn(`Cannot emit event ${event}: WebSocket is not open (state: ${this.ws.readyState})`);
      }
    } catch (error) {
      console.error("Error emitting event:", error);
    }
    return this;
  }

  on(event: string, listener: (...args: any[]) => void): this {
    if (event === "connect") {
      // Handle connect event
      if (this.ws.readyState === WebSocket.OPEN) {
        // Already connected, call immediately
        setTimeout(() => listener(), 0);
      } else {
        // Wait for connection - chain with existing handler
        const originalOnOpen = this.ws.onopen;
        this.ws.onopen = (event: Event) => {
          // Call original handler first (set by client adapter)
          if (originalOnOpen) {
            originalOnOpen.call(this.ws, event);
          }
          // Then call our listener
          listener();
        };
      }
    } else if (event === "disconnect") {
      // Handle disconnect event - chain with existing handler
      const originalOnClose = this.ws.onclose;
      this.ws.onclose = (event: CloseEvent) => {
        // Call original handler first (set by client adapter)
        if (originalOnClose) {
          originalOnClose.call(this.ws, event);
        }
        // Then call our listener
        listener();
      };
    } else {
      // Store handler for custom events
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, []);
      }
      this.eventHandlers.get(event)!.push(listener);
    }
    return this;
  }

  /**
   * Handle incoming message from WebSocket
   */
  private handleMessage(data: string | ArrayBuffer | Blob): void {
    try {
      if (data instanceof ArrayBuffer) {
        // Binary message - extract event type ID and buffer
        // Format: [eventTypeId (1 byte)][bufferData]
        const reader = new BufferReader(data);
        const eventTypeId = reader.readUInt8();
        const eventName = eventTypeRegistry.decode(eventTypeId);
        // Remaining buffer is the event data
        const eventDataBuffer = data.slice(reader.getOffset());
        
        const handlers = this.eventHandlers.get(eventName);
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              // Pass the buffer as the first argument
              handler(eventDataBuffer);
            } catch (error) {
              console.error(`Error in event handler for ${eventName}:`, error);
            }
          });
        }
        return;
      }

      if (data instanceof Blob) {
        // Blob - check if it's binary or text
        // For binary data, convert to ArrayBuffer
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            // Binary data - handle as ArrayBuffer
            this.handleMessage(reader.result);
          } else if (typeof reader.result === "string") {
            // Text data - process as JSON
            this.processMessage(reader.result);
          }
        };
        // Try to read as ArrayBuffer first (for binary data)
        reader.readAsArrayBuffer(data);
        return;
      }

      // String message - process as JSON
      if (typeof data === "string") {
        this.processMessage(data);
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  private processMessage(messageStr: string): void {
    try {
      const parsed = JSON.parse(messageStr);
      const { event, args } = parsed;

      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(...args);
          } catch (error) {
            console.error(`Error in event handler for ${event}:`, error);
          }
        });
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  }

  disconnect(close?: boolean): this {
    try {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(close ? 1000 : undefined); // Normal closure if close is true
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
   * Get the underlying WebSocket instance
   */
  getUnderlyingSocket(): WebSocket {
    return this.ws;
  }
}

