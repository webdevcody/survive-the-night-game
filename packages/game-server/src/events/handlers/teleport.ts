import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";

export function onTeleportToBase(context: HandlerContext, socket: ISocketAdapter): void {
  const player = context.players.get(socket.id);
  if (!player) return;
  if (player.isDead()) return;

  const spawnPosition = context.getMapManager().getPlayerSpawnPositionForMap();
  player.setPosition(spawnPosition);
}

export const teleportToBaseHandler: SocketEventHandler<void> = {
  event: "TELEPORT_TO_BASE",
  handler: onTeleportToBase,
};
