import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";

export function onReloadWeapon(context: HandlerContext, socket: ISocketAdapter): void {
  const player = context.players.get(socket.id);
  if (!player) {
    return;
  }

  player.requestReload();
}

export const reloadWeaponHandler: SocketEventHandler<Record<string, never>> = {
  event: "RELOAD_WEAPON",
  handler: (context, socket) => {
    onReloadWeapon(context, socket);
  },
};
