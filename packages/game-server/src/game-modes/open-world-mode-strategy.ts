import { IGameModeStrategy, GameModeConfig } from "./game-mode-strategy";
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
    hasSurvivors: false,
    minPlayers: 1,
  };

  getConfig(): GameModeConfig {
    return this.config;
  }

  onGameStart(_gameManagers: IGameManagers): void {}

  update(_deltaTime: number, _gameManagers: IGameManagers): void {}

  getPlayerSpawnPosition(_player: Player, gameManagers: IGameManagers): Vector2 {
    return gameManagers.getMapManager().getPlayerSpawnPositionForMap();
  }

  handlePlayerSpawn(player: Player, gameManagers: IGameManagers): void {
    const pending = player.consumePendingLogoutSpawnTile();
    if (pending) {
      const restored = gameManagers.getMapManager().tryGetPositionForSavedTile(pending.x, pending.y);
      if (restored) {
        player.getExt(Positionable).setPosition(restored);
        return;
      }
    }
    const spawnPosition = this.getPlayerSpawnPosition(player, gameManagers);
    player.getExt(Positionable).setPosition(spawnPosition);
  }

  canPlayerRespawn(_player: Player): boolean {
    return true;
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
