import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function onPlayerRespawnRequest(context: HandlerContext, socket: ISocketAdapter): void;
export declare const playerRespawnRequestHandler: SocketEventHandler<void>;
