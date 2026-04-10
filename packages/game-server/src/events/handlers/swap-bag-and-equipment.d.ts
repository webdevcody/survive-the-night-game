import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { type EquipmentSlotKey } from "@shared/util/inventory";
export declare function onSwapBagAndEquipment(context: HandlerContext, socket: ISocketAdapter, data: {
    bagIndex: number;
    equipSlot: EquipmentSlotKey;
}): void;
export declare const swapBagAndEquipmentHandler: SocketEventHandler<{
    bagIndex: number;
    equipSlot: EquipmentSlotKey;
}>;
