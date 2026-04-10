import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function onSelectInventorySlot(context: HandlerContext, socket: ISocketAdapter, data: {
    slotIndex: number;
}): void;
export declare const selectInventorySlotHandler: SocketEventHandler<{
    slotIndex: number;
}>;
