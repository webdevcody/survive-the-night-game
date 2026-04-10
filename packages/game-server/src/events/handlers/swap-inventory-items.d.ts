import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function onSwapInventoryItems(context: HandlerContext, socket: ISocketAdapter, data: {
    fromSlotIndex: number;
    toSlotIndex: number;
}): void;
export declare const swapInventoryItemsHandler: SocketEventHandler<{
    fromSlotIndex: number;
    toSlotIndex: number;
}>;
