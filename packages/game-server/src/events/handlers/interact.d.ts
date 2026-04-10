import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function onInteract(context: HandlerContext, socket: ISocketAdapter, data: {
    targetEntityId?: number | null;
}): void;
export declare const interactHandler: SocketEventHandler<{
    targetEntityId?: number | null;
}>;
