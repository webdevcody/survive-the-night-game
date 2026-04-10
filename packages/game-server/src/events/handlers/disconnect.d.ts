import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function onDisconnect(context: HandlerContext, socket: ISocketAdapter): void;
export declare const disconnectHandler: SocketEventHandler<void>;
