import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function handlePing(context: HandlerContext, socket: ISocketAdapter, timestamp: number): void;
export declare function handlePingUpdate(context: HandlerContext, socket: ISocketAdapter, latency: number): void;
export declare const pingHandler: SocketEventHandler<number>;
export declare const pingUpdateHandler: SocketEventHandler<number>;
