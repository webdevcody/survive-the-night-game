import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { infectionConfig } from "@shared/config/infection-config";
import { distance } from "@shared/util/physics";
import { ZombieFactory } from "@/util/zombie-factory";

export interface SpawnZombiePayload {
  x: number;
  y: number;
}

export function onSpawnZombie(
  context: HandlerContext,
  socket: ISocketAdapter,
  payload: SpawnZombiePayload
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  // Must be a zombie player
  if (!player.isZombie()) {
    return;
  }

  // Must be in infection mode
  const strategy = context.gameServer.getGameLoop().getGameModeStrategy();
  if (strategy.getConfig().modeId !== "infection") {
    return;
  }

  // Check cooldown
  if (!player.isZombieSpawnReady()) {
    return;
  }

  // Validate spawn position is within radius of player
  const playerPos = player.getCenterPosition();
  const spawnPos = { x: payload.x, y: payload.y };
  const dist = distance(playerPos, spawnPos);

  if (dist > infectionConfig.ZOMBIE_SPAWN_RADIUS) {
    return;
  }

  // Create the zombie at the spawn position
  const gameManagers = context.getGameManagers();
  ZombieFactory.spawnZombieAtLocation("regular", payload, gameManagers, false);

  // Reset the cooldown
  player.resetZombieSpawnCooldown();
}

export const spawnZombieHandler: SocketEventHandler<SpawnZombiePayload> = {
  event: "SPAWN_ZOMBIE",
  handler: onSpawnZombie,
};
