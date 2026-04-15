import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { performPlayerDisconnect } from "@/session/player-session-lifecycle";

export async function onDisconnect(context: HandlerContext, socket: ISocketAdapter): Promise<void> {
  if (context.performManagedDisconnect) {
    await context.performManagedDisconnect(socket);
    return;
  }
  await performPlayerDisconnect(context, socket);
}

export const disconnectHandler: SocketEventHandler<void> = {
  event: "disconnect",
  handler: onDisconnect,
};
