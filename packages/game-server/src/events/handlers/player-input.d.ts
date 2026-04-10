import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { Input } from "@shared/util/input";
import { SocketEventHandler } from "./types";
export declare function onPlayerInput(context: HandlerContext, socket: ISocketAdapter, input: unknown): void;
export declare const playerInputHandler: SocketEventHandler<Input>;
