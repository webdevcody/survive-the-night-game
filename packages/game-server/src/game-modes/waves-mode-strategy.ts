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

/**
 * Waves Mode Strategy - The default survival mode
 *
 * In this mode:
 * - Players defend a car from waves of zombies
 * - Zombies spawn every 60 seconds in increasingly difficult waves
 * - Players respawn at the campsite after death
 * - Friendly fire is disabled
 * - Bosses spawn on specific waves
 * - Survivors can be rescued between waves
 */
export class WavesModeStrategy implements IGameModeStrategy {
  private readonly config: GameModeConfig = {
    modeId: "waves",
    displayName: "Survive the Night",
    friendlyFireEnabled: false,
    allowRespawn: true,
    hasCarEntity: true,
    hasWaveSystem: true,
    hasBosses: true,
    hasSurvivors: true,
    minPlayers: 1,
  };

  getConfig(): GameModeConfig {
    return this.config;
  }

  onGameStart(gameManagers: IGameManagers): void {
    // Waves mode uses default game initialization
    // Map generation and car creation are handled by MapManager
    console.log("[WavesModeStrategy] Game started in Waves mode");
  }

  onGameEnd(gameManagers: IGameManagers): void {
    console.log("[WavesModeStrategy] Game ended");
  }

  update(deltaTime: number, gameManagers: IGameManagers): void {
    // Waves mode update logic is handled by GameLoop's handleWaveSystem
    // No additional mode-specific updates needed here
  }

  getPlayerSpawnPosition(player: Player, gameManagers: IGameManagers): Vector2 {
    // Spawn players at random campsite position
    const position = gameManagers.getMapManager().getRandomCampsitePosition();
    return position ?? gameManagers.getMapManager().getRandomGrassPosition();
  }

  handlePlayerSpawn(player: Player, gameManagers: IGameManagers): void {
    // In waves mode, spawn players at the campsite
    const spawnPosition = this.getPlayerSpawnPosition(player, gameManagers);
    player.getExt(Positionable).setPosition(spawnPosition);
    
    // Check if player spawned in toxic gas and apply poison if needed
    this.checkPlayerInToxicGas(player, gameManagers);
  }

  canPlayerRespawn(player: Player): boolean {
    // Always allow respawn in waves mode
    return true;
  }

  /**
   * Check if a player is inside any toxic gas clouds or zones and apply poison if needed
   */
  private checkPlayerInToxicGas(player: Player, gameManagers: IGameManagers): void {
    if (!player.hasExt(Positionable)) return;
    
    const playerPos = player.getExt(Positionable);
    const playerCenter = playerPos.getCenterPosition();
    const entityManager = gameManagers.getEntityManager();
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    
    // Check toxic gas clouds
    const toxicGasClouds = entityManager.getEntitiesByType("toxic_gas_cloud" as any);
    for (const cloud of toxicGasClouds) {
      if (!cloud.hasExt(Positionable) || !cloud.hasExt(ToxicGasCloudExtension)) continue;
      if (cloud.isMarkedForRemoval()) continue;
      
      const cloudPos = cloud.getExt(Positionable).getCenterPosition();
      const radius = TILE_SIZE / 2; // Half tile radius
      const dx = cloudPos.x - playerCenter.x;
      const dy = cloudPos.y - playerCenter.y;
      const distanceSquared = dx * dx + dy * dy;
      const radiusSquared = radius * radius;
      
      if (distanceSquared < radiusSquared) {
        // Player is in cloud - apply poison if not already poisoned
        if (!player.hasExt(Poison)) {
          player.addExtension(new Poison(player, 3, 1, 1));
        }
        return; // Found one, no need to check others
      }
    }
    
    // Check toxic biome zones
    const toxicBiomeZones = entityManager.getEntitiesByType("toxic_biome_zone" as any);
    for (const zone of toxicBiomeZones) {
      if (!zone.hasExt(Positionable) || !zone.hasExt(ToxicBiomeZoneExtension)) continue;
      if (zone.isMarkedForRemoval()) continue;
      
      const zonePos = zone.getExt(Positionable).getPosition();
      const zoneSize = zone.getExt(Positionable).getSize();
      
      // Check if player center is within zone bounds
      if (
        playerCenter.x >= zonePos.x &&
        playerCenter.x <= zonePos.x + zoneSize.x &&
        playerCenter.y >= zonePos.y &&
        playerCenter.y <= zonePos.y + zoneSize.y
      ) {
        // Player is in zone - apply poison if not already poisoned
        if (!player.hasExt(Poison)) {
          player.addExtension(new Poison(player, 3, 1, 1));
        }
        return; // Found one, no need to check others
      }
    }
  }

  checkWinCondition(gameManagers: IGameManagers): WinConditionResult {
    // Game ends when ALL players are dead
    const players = gameManagers.getEntityManager().getPlayerEntities() as Player[];

    if (players.length > 0 && players.every((p) => p.isDead())) {
      return {
        gameEnded: true,
        winnerId: null,
        winnerName: null,
        message: "Game Over! All players have died.",
      };
    }

    return {
      gameEnded: false,
      winnerId: null,
      winnerName: null,
      message: "",
    };
  }

  shouldDamageTarget(attacker: IEntity, target: IEntity, attackerId: number): boolean {
    // Don't damage yourself
    if (target.getId() === attackerId) {
      return false;
    }

    // In waves mode, only damage entities in the "enemy" group
    if (!target.hasExt(Groupable)) {
      return false;
    }

    return target.getExt(Groupable).getGroup() === "enemy";
  }

  getZombieFallbackTarget(gameManagers: IGameManagers): Vector2 | null {
    // Zombies fall back to targeting the car
    return gameManagers.getMapManager().getCarLocation();
  }

  // Wave system hooks - called by GameLoop
  onWaveStart(waveNumber: number, gameManagers: IGameManagers): void {
    console.log(`[WavesModeStrategy] Wave ${waveNumber} started`);
  }

  onWaveComplete(waveNumber: number, gameManagers: IGameManagers): void {
    console.log(`[WavesModeStrategy] Wave ${waveNumber} completed`);
  }

  onPreparationStart(waveNumber: number, gameManagers: IGameManagers): void {
    console.log(`[WavesModeStrategy] Preparation for wave ${waveNumber} started`);
  }
}
