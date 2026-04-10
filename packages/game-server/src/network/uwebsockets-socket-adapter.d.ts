import { ISocketAdapter } from "@shared/network/socket-adapter";
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
    publish: (topic: string, message: ArrayBuffer | string, isBinary?: boolean, compress?: boolean) => boolean;
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
export declare class UWebSocketsSocketAdapter implements ISocketAdapter {
    private ws;
    private eventHandlers;
    private socketId;
    private handshakeQuery;
    constructor(ws: UWebSocket, socketId: string, queryParams?: Record<string, string | string[]>);
    emit(event: string, ...args: any[]): boolean;
    on(event: string, listener: (...args: any[]) => void): this;
    /**
     * Trigger registered handlers for an internally generated event
     */
    triggerEvent(event: string, ...args: any[]): void;
    /**
     * Handle incoming message from uWebSockets
     * This is called by the server adapter when a message is received
     */
    handleMessage(message: ArrayBuffer | string): void;
    private dispatchJsonMessage;
    disconnect(close?: boolean): this;
    get id(): string;
    get handshake(): {
        query: Record<string, string | string[]>;
    };
    /**
     * Get the underlying uWebSockets WebSocket instance
     */
    getUnderlyingSocket(): UWebSocket;
}
export {};
