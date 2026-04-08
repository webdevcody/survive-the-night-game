import {
  IGameModeStrategy,
  GameModeConfig,
  WinConditionResult,
} from "./game-mode-strategy";
import { IGameManagers } from "@/managers/types";
import { Player } from "@/entities/players/player";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import Groupable from "@/extensions/groupable";
import Positionable from "@/extensions/positionable";

/**
 * Open world — persistent shard, seeded map generation.
 */
export class OpenWorldModeStrategy implements IGameModeStrategy {
  private readonly config: GameModeConfig = {
    modeId: "open_world",
    displayName: "Open World",
    friendlyFireEnabled: false,
    allowRespawn: true,
    hasCarEntity: false,
    hasBosses: false,
    hasSurvivors: true,
    minPlayers: 1,
  };

  getConfig(): GameModeConfig {
    return this.config;
  }

  onGameStart(_gameManagers: IGameManagers): void {}

  onGameEnd(_gameManagers: IGameManagers): void {}

  update(_deltaTime: number, gameManagers: IGameManagers): void {
    gameManagers.getMapManager().tickOpenWorldZombieSpawnPoints();
  }

  getPlayerSpawnPosition(_player: Player, gameManagers: IGameManagers): Vector2 {
    const position = gameManagers.getMapManager().getRandomCampsitePosition();
    return position ?? gameManagers.getMapManager().getRandomGrassPosition();
  }

  handlePlayerSpawn(player: Player, gameManagers: IGameManagers): void {
    const spawnPosition = this.getPlayerSpawnPosition(player, gameManagers);
    player.getExt(Positionable).setPosition(spawnPosition);
  }

  canPlayerRespawn(_player: Player): boolean {
    return true;
  }

  checkWinCondition(_gameManagers: IGameManagers): WinConditionResult {
    return {
      gameEnded: false,
      winnerId: null,
      winnerName: null,
      message: "",
    };
  }

  shouldDamageTarget(attacker: IEntity, target: IEntity, attackerId: number): boolean {
    if (target.getId() === attackerId) {
      return false;
    }
    if (!target.hasExt(Groupable)) {
      return false;
    }
    return target.getExt(Groupable).getGroup() === "enemy";
  }

  getZombieFallbackTarget(_gameManagers: IGameManagers): Vector2 | null {
    return null;
  }
}
