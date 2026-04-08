import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";

export interface SpawnZombiePayload {
  x: number;
  y: number;
}

export function onSpawnZombie(
  _context: HandlerContext,
  _socket: ISocketAdapter,
  _payload: SpawnZombiePayload
): void {
  // Zombie spawn-from-player was tied to removed infection mode; ignore.
}

export const spawnZombieHandler: SocketEventHandler<SpawnZombiePayload> = {
  event: "SPAWN_ZOMBIE",
  handler: onSpawnZombie,
};
