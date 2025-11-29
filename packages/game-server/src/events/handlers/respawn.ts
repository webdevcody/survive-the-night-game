import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";

export function onPlayerRespawnRequest(context: HandlerContext, socket: ISocketAdapter): void {
  const player = context.players.get(socket.id);
  if (!player) return;
  if (!player.isDead()) return;

  // Check if the game mode allows normal respawning via client request
  const strategy = context.gameServer.getGameLoop().getGameModeStrategy();
  const config = strategy.getConfig();

  // In Battle Royale mode (no normal respawns), don't allow client-triggered respawn
  // Zombie conversion is handled automatically by handleZombieRespawns in the game mode strategy
  if (!config.allowRespawn) {
    return;
  }

  player.respawn();
}

export const playerRespawnRequestHandler: SocketEventHandler<void> = {
  event: "PLAYER_RESPAWN_REQUEST",
  handler: onPlayerRespawnRequest,
};
