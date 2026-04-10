import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function handleChat(context: HandlerContext, socket: ISocketAdapter, message: unknown, adminPassword?: string): Promise<void>;
export declare const sendChatHandler: SocketEventHandler<{
    message: string;
    adminPassword?: string;
}>;
