import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { AdminCommand } from "@shared/commands/commands";
import { SocketEventHandler } from "./types";

export function handleAdminCommand(
  context: HandlerContext,
  socket: ISocketAdapter,
  command: AdminCommand
): void {
  context.getCommandManager().handleCommand(command);
}

export const adminCommandHandler: SocketEventHandler<AdminCommand> = {
  event: "ADMIN_COMMAND",
  handler: handleAdminCommand,
};
