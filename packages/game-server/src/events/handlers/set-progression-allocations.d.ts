import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import type { SetProgressionAllocationsEventData } from "@shared/events/client-sent/events/set-progression-allocations";
export declare function setProgressionAllocations(context: HandlerContext, socket: ISocketAdapter, payload: SetProgressionAllocationsEventData): void;
export declare const setProgressionAllocationsHandler: SocketEventHandler<SetProgressionAllocationsEventData>;
