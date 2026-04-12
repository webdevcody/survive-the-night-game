import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function onUseLoadoutConsumable(context: HandlerContext, socket: ISocketAdapter, data: {
    which: 0 | 1;
}): void;
export declare const useLoadoutConsumableHandler: SocketEventHandler<{
    which: 0 | 1;
}>;
