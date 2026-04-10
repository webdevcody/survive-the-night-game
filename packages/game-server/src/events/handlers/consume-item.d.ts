import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { ItemType } from "@shared/util/inventory";
import { SocketEventHandler } from "./types";
export declare function onConsumeItem(context: HandlerContext, socket: ISocketAdapter, data: {
    itemType: ItemType | null;
}): void;
export declare const consumeItemHandler: SocketEventHandler<{
    itemType: ItemType | null;
}>;
