import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
type RequestCombatRollData = {
    angle: number;
};
export declare function onRequestCombatRoll(context: HandlerContext, socket: ISocketAdapter, data: RequestCombatRollData): void;
export declare const requestCombatRollHandler: SocketEventHandler<RequestCombatRollData>;
export {};
