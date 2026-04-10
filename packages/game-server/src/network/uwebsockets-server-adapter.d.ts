import { IServerAdapter } from "@shared/network/server-adapter";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { Server as HttpServer } from "http";
import uWS from "uwebsockets.js";
export declare class UWebSocketsServerAdapter implements IServerAdapter {
    private app;
    private socketAdapters;
    private connectionHandlers;
    private nextSocketId;
    private wsMap;
    constructor(httpServer: HttpServer | null, corsOptions?: {
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
     * Get the underlying uWebSockets app instance
     */
    getUnderlyingApp(): uWS.TemplatedApp;
}
