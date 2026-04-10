import { ISocketAdapter } from "@shared/network/socket-adapter";
import { SocketEventHandler } from "./types";
import { HandlerContext } from "@/events/context";
export declare function onDropItem(context: HandlerContext, socket: ISocketAdapter, data: {
    slotIndex: number;
    amount?: number;
}): void;
export declare const dropItemHandler: SocketEventHandler<{
    slotIndex: number;
    amount?: number;
}>;
