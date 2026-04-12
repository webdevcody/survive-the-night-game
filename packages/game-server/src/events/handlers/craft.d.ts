import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import type { CraftRequestEventData } from "@shared/events/client-sent/events/craft-request";
import { SocketEventHandler } from "./types";
export declare function onCraftRequest(context: HandlerContext, socket: ISocketAdapter, recipe: unknown): void;
export declare function setPlayerCrafting(context: HandlerContext, socket: ISocketAdapter, isCrafting: boolean): void;
export declare const craftRequestHandler: SocketEventHandler<CraftRequestEventData>;
export declare const startCraftingHandler: SocketEventHandler<void>;
export declare const stopCraftingHandler: SocketEventHandler<void>;
