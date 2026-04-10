import { Server } from "socket.io";
import { IServerAdapter } from "@shared/network/server-adapter";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { Server as HttpServer } from "http";
/**
 * Socket.IO implementation of IServerAdapter
 */
export declare class SocketIOServerAdapter implements IServerAdapter {
    private io;
    private socketAdapters;
    constructor(httpServer: HttpServer, corsOptions?: {
        origin: string | string[];
        methods: string[];
    });
    on(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
    listen(port: number, callback?: () => void): void;
    get sockets(): {
        size: number;
        sockets: Map<string, ISocketAdapter>;
    };
    /**
     * Get the underlying Socket.IO server (for cases where direct access is needed)
     */
    getUnderlyingServer(): Server;
}
