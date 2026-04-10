import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { RecipeType } from "@shared/util/recipes";
import { SocketEventHandler } from "./types";
export declare function onCraftRequest(context: HandlerContext, socket: ISocketAdapter, recipe: unknown): void;
export declare function setPlayerCrafting(context: HandlerContext, socket: ISocketAdapter, isCrafting: boolean): void;
export declare const craftRequestHandler: SocketEventHandler<RecipeType>;
export declare const startCraftingHandler: SocketEventHandler<void>;
export declare const stopCraftingHandler: SocketEventHandler<void>;
