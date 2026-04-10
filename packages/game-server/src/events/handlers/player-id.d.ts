import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function sendPlayerId(context: HandlerContext, socket: ISocketAdapter): void;
export declare const requestPlayerIdHandler: SocketEventHandler<void>;
