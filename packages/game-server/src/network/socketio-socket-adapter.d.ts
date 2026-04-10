import { Socket } from "socket.io";
import { ISocketAdapter } from "@shared/network/socket-adapter";
/**
 * Socket.IO implementation of ISocketAdapter for server-side sockets
 */
export declare class SocketIOSocketAdapter implements ISocketAdapter {
    private socket;
    constructor(socket: Socket);
    emit(event: string, ...args: any[]): boolean;
    on(event: string, listener: (...args: any[]) => void): this;
    disconnect(close?: boolean): this;
    get id(): string;
    get handshake(): {
        query: Record<string, string | string[]>;
    };
    /**
     * Get the underlying Socket.IO socket (for cases where direct access is needed)
     */
    getUnderlyingSocket(): Socket;
}
