import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";

export function onTeleportToBase(context: HandlerContext, socket: ISocketAdapter): void {
  const player = context.players.get(socket.id);
  if (!player) return;
  if (player.isDead()) return;

  // Get campsite position from map manager
  const campsitePosition = context.getMapManager().getRandomCampsitePosition();
  if (campsitePosition) {
    player.setPosition(campsitePosition);
  }
}

export const teleportToBaseHandler: SocketEventHandler<void> = {
  event: "TELEPORT_TO_BASE",
  handler: onTeleportToBase,
};
