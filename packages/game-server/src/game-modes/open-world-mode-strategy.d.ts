import { IGameModeStrategy, GameModeConfig, WinConditionResult } from "./game-mode-strategy";
import { IGameManagers } from "@/managers/types";
import { Player } from "@/entities/players/player";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
/**
 * Open world — persistent shard, seeded map generation.
 */
export declare class OpenWorldModeStrategy implements IGameModeStrategy {
    private readonly config;
    getConfig(): GameModeConfig;
    onGameStart(_gameManagers: IGameManagers): void;
    onGameEnd(_gameManagers: IGameManagers): void;
    update(_deltaTime: number, _gameManagers: IGameManagers): void;
    getPlayerSpawnPosition(_player: Player, gameManagers: IGameManagers): Vector2;
    handlePlayerSpawn(player: Player, gameManagers: IGameManagers): void;
    canPlayerRespawn(_player: Player): boolean;
    checkWinCondition(_gameManagers: IGameManagers): WinConditionResult;
    shouldDamageTarget(attacker: IEntity, target: IEntity, attackerId: number): boolean;
    getZombieFallbackTarget(_gameManagers: IGameManagers): Vector2 | null;
}
