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
import Poison from "@/extensions/poison";
import { ToxicGasCloudExtension } from "@/extensions/toxic-gas-cloud-extension";
import { ToxicBiomeZoneExtension } from "@/extensions/toxic-biome-zone-extension";
import { getConfig } from "@shared/config";
import { distance } from "@shared/util/physics";

/**
 * Open world — persistent shard, no waves, no center car, seeded map generation.
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
    this.checkPlayerInToxicGas(player, gameManagers);
  }

  canPlayerRespawn(_player: Player): boolean {
    return true;
  }

  private checkPlayerInToxicGas(player: Player, gameManagers: IGameManagers): void {
    if (!player.hasExt(Positionable)) return;
    if (player.isZombie()) return;

    const playerPos = player.getExt(Positionable);
    const playerCenter = playerPos.getCenterPosition();
    const entityManager = gameManagers.getEntityManager();
    const TILE_SIZE = getConfig().world.TILE_SIZE;

    const toxicGasClouds = entityManager.getEntitiesByType("toxic_gas_cloud" as any);
    for (const cloud of toxicGasClouds) {
      if (!cloud.hasExt(Positionable) || !cloud.hasExt(ToxicGasCloudExtension)) continue;
      if (cloud.isMarkedForRemoval()) continue;

      const cloudPos = cloud.getExt(Positionable).getCenterPosition();
      const radius = TILE_SIZE / 2;
      const dist = distance(cloudPos, playerCenter);

      if (dist < radius) {
        if (!player.hasExt(Poison)) {
          player.addExtension(new Poison(player, 3, 1, 1));
        }
        return;
      }
    }

    const toxicBiomeZones = entityManager.getEntitiesByType("toxic_biome_zone" as any);
    for (const zone of toxicBiomeZones) {
      if (!zone.hasExt(Positionable) || !zone.hasExt(ToxicBiomeZoneExtension)) continue;
      if (zone.isMarkedForRemoval()) continue;

      const zonePos = zone.getExt(Positionable).getPosition();
      const zoneSize = zone.getExt(Positionable).getSize();

      if (
        playerCenter.x >= zonePos.x &&
        playerCenter.x <= zonePos.x + zoneSize.x &&
        playerCenter.y >= zonePos.y &&
        playerCenter.y <= zonePos.y + zoneSize.y
      ) {
        if (!player.hasExt(Poison)) {
          player.addExtension(new Poison(player, 3, 1, 1));
        }
        return;
      }
    }
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
