import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";

/** No-op: idle tracking is updated in ServerSocketManager before this runs. */
export function onPointerActivity(_context: HandlerContext, _socket: ISocketAdapter): void {}

export const pointerActivityHandler: SocketEventHandler<void> = {
  event: "POINTER_ACTIVITY",
  handler: onPointerActivity,
};
