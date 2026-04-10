import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function onSelectWeaponLoadout(context: HandlerContext, socket: ISocketAdapter, data: {
    loadout: number;
}): void;
export declare const selectWeaponLoadoutHandler: SocketEventHandler<{
    loadout: number;
}>;
