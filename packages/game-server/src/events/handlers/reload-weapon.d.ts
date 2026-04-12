import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export declare function onReloadWeapon(context: HandlerContext, socket: ISocketAdapter): void;
export declare const reloadWeaponHandler: SocketEventHandler<Record<string, never>>;
