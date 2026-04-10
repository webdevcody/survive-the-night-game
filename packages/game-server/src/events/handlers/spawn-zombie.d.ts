import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
export interface SpawnZombiePayload {
    x: number;
    y: number;
}
export declare function onSpawnZombie(_context: HandlerContext, _socket: ISocketAdapter, _payload: SpawnZombiePayload): void;
export declare const spawnZombieHandler: SocketEventHandler<SpawnZombiePayload>;
