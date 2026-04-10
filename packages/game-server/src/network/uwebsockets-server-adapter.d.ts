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
    /** Set by ServerSocketManager when editor map reload HTTP is enabled (dev). */
    private editorReloadWorldMapHandler;
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
    /**
     * uWebSockets matches routes in registration order; this must be set before listen().
     */
    setEditorReloadWorldMapHandler(handler: (res: uWS.HttpResponse, req: uWS.HttpRequest) => void): void;
}
