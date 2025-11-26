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
  }

  canPlayerRespawn(player: Player): boolean {
    // Always allow respawn in waves mode
    return true;
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
