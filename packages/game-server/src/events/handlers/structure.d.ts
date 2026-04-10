import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { ItemType } from "@shared/util/inventory";
import { SocketEventHandler } from "./types";
export declare function onPlaceStructure(context: HandlerContext, socket: ISocketAdapter, data: {
    itemType: ItemType;
    position: {
        x: number;
        y: number;
    };
}): void;
export declare const placeStructureHandler: SocketEventHandler<{
    itemType: ItemType;
    position: {
        x: number;
        y: number;
    };
}>;
