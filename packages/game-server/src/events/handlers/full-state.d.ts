import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function sendFullState(context: HandlerContext, socket: ISocketAdapter): void;
export declare const requestFullStateHandler: SocketEventHandler<void>;
