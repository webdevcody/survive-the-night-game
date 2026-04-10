import { IServerAdapter } from "@shared/network/server-adapter";
import { Server as HttpServer } from "http";
/**
 * Create the appropriate server adapter based on configuration
 */
export declare function createServerAdapter(httpServer: HttpServer, corsOptions?: {
    origin: string | string[];
    methods: string[];
}): IServerAdapter;
