import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { PlayerColor } from "@shared/commands/commands";
export declare function changePlayerColor(context: HandlerContext, socket: ISocketAdapter, payload: {
    color: PlayerColor;
}): void;
export declare const changePlayerColorHandler: SocketEventHandler<{
    color: PlayerColor;
}>;
