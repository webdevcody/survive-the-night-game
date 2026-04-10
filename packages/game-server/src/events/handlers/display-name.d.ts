import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function setPlayerDisplayName(context: HandlerContext, socket: ISocketAdapter, displayName: string): void;
export declare const setDisplayNameHandler: SocketEventHandler<{
    displayName: string;
}>;
