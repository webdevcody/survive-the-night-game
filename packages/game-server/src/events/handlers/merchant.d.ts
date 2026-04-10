import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function onMerchantBuy(context: HandlerContext, socket: ISocketAdapter, data: {
    merchantId: number;
    itemIndex: number;
}): void;
export declare function onMerchantSell(context: HandlerContext, socket: ISocketAdapter, data: {
    merchantId: number;
    inventorySlot: number;
}): void;
export declare const merchantBuyHandler: SocketEventHandler<{
    merchantId: number;
    itemIndex: number;
}>;
export declare const merchantSellHandler: SocketEventHandler<{
    merchantId: number;
    inventorySlot: number;
}>;
