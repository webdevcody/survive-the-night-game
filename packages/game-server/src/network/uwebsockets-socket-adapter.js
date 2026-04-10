import { BufferReader } from "@shared/util/buffer-serialization";
import { deserializeClientEvent } from "@shared/events/client-sent/client-event-serialization";
import { eventTypeRegistry } from "@shared/util/event-type-encoding";
import { TextDecoder } from "util";
const textDecoder = new TextDecoder();
/**
 * uWebSockets implementation of ISocketAdapter for server-side sockets
 */
export class UWebSocketsSocketAdapter {
    constructor(ws, socketId, queryParams) {
        this.ws = ws;
        this.eventHandlers = new Map();
        this.handshakeQuery = {};
        this.socketId = socketId;
        if (queryParams) {
            this.handshakeQuery = queryParams;
        }
    }
    emit(event, ...args) {
        try {
            // If first argument is a Buffer, prepend event type ID and send as binary
            if (args.length > 0 && Buffer.isBuffer(args[0])) {
                // Encode event type to uint8
                const eventTypeId = eventTypeRegistry.encode(event);
                const eventTypeBuffer = Buffer.allocUnsafe(1);
                eventTypeBuffer.writeUInt8(eventTypeId, 0);
                // Combine: [eventTypeId (1 byte)][bufferData]
                const combinedBuffer = Buffer.concat([eventTypeBuffer, args[0]]);
                // Convert to ArrayBuffer for uWebSockets
                // Create a new ArrayBuffer by copying the buffer data to ensure correct format
                const arrayBuffer = combinedBuffer.buffer.slice(combinedBuffer.byteOffset, combinedBuffer.byteOffset + combinedBuffer.byteLength);
                const result = this.ws.send(arrayBuffer, true); // Send as binary
                return result === 1; // 1 = success in uWebSockets
            }
            // Otherwise, serialize as JSON
            const message = JSON.stringify({ event, args });
            const result = this.ws.send(message, false);
            return result === 1; // 1 = success in uWebSockets
        }
        catch (error) {
            console.error("Error emitting event:", error);
            return false;
        }
    }
    on(event, listener) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(listener);
        return this;
    }
    /**
     * Trigger registered handlers for an internally generated event
     */
    triggerEvent(event, ...args) {
        const handlers = this.eventHandlers.get(event);
        if (!handlers) {
            return;
        }
        handlers.forEach((handler) => {
            try {
                handler(...args);
            }
            catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }
    /**
     * Handle incoming message from uWebSockets
     * This is called by the server adapter when a message is received
     */
    handleMessage(message) {
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
                        let handlerArgs = null;
                        try {
                            handlerArgs = deserializeClientEvent(eventName, payload);
                        }
                        catch (error) {
                            console.error(`Error deserializing client event ${eventName}:`, error);
                            handlerArgs = null;
                        }
                        handlers.forEach((handler) => {
                            try {
                                if (handlerArgs && handlerArgs.length > 0) {
                                    // handlerArgs is an array like [{ displayName: "..." }] or [data]
                                    // The handler wrapper from setupSocketListeners expects (payload)
                                    // and will add (context, socket) automatically
                                    handler(handlerArgs[0]);
                                }
                                else if (payload.byteLength > 0) {
                                    // Fallback: pass raw payload if deserialization failed
                                    handler(payload);
                                }
                                else {
                                    handler();
                                }
                            }
                            catch (error) {
                                console.error(`Error in event handler for ${eventName}:`, error);
                            }
                        });
                    }
                    return;
                }
                catch (binaryError) {
                    // Fallback to JSON parsing if binary decoding fails
                    try {
                        const messageStr = textDecoder.decode(message);
                        const parsed = JSON.parse(messageStr);
                        this.dispatchJsonMessage(parsed.event, parsed.args);
                        return;
                    }
                    catch (jsonError) {
                        console.error("Failed to parse incoming message:", binaryError);
                        return;
                    }
                }
            }
            // String message fallback (JSON)
            const messageStr = typeof message === "string" ? message : textDecoder.decode(message);
            const parsed = JSON.parse(messageStr);
            this.dispatchJsonMessage(parsed.event, parsed.args);
        }
        catch (error) {
            console.error("Error handling message:", error);
        }
    }
    dispatchJsonMessage(event, args) {
        const handlers = this.eventHandlers.get(event);
        if (!handlers) {
            return;
        }
        const normalizedArgs = Array.isArray(args) ? args : args !== undefined ? [args] : [];
        handlers.forEach((handler) => {
            try {
                handler(...normalizedArgs);
            }
            catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }
    disconnect(close) {
        try {
            if (close) {
                this.ws.end(1000); // Normal closure
            }
            else {
                this.ws.close();
            }
        }
        catch (error) {
            console.error("Error disconnecting socket:", error);
        }
        return this;
    }
    get id() {
        return this.socketId;
    }
    get handshake() {
        return {
            query: this.handshakeQuery,
        };
    }
    /**
     * Get the underlying uWebSockets WebSocket instance
     */
    getUnderlyingSocket() {
        return this.ws;
    }
}
