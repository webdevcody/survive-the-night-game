import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function onSetWeaponLoadoutSlot(context: HandlerContext, socket: ISocketAdapter, data: {
    slot: number;
    bagIndex: number;
}): void;
export declare const setWeaponLoadoutSlotHandler: SocketEventHandler<{
    slot: number;
    bagIndex: number;
}>;
