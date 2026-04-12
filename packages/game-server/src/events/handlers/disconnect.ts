import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { performPlayerDisconnect } from "@/session/player-session-lifecycle";

export function onDisconnect(context: HandlerContext, socket: ISocketAdapter): void {
  performPlayerDisconnect(context, socket);
}

export const disconnectHandler: SocketEventHandler<void> = {
  event: "disconnect",
  handler: onDisconnect,
};
