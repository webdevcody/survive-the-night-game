import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import type { PersistedPlayerProgress } from "@/services/player-progress-types";
export declare function onConnection(context: HandlerContext, socket: ISocketAdapter, initialProgress?: PersistedPlayerProgress): void;
