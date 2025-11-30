import { IGameManagers } from "@/managers/types";
import { Player } from "@/entities/players/player";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import { AIPlayerManager } from "@/ai/ai-player-manager";

/**
 * Configuration for the game mode (immutable after creation)
 */
export interface GameModeConfig {
  /** Unique identifier for the game mode */
  readonly modeId: string;

  /** Display name for UI */
  readonly displayName: string;

  /** Whether friendly fire is enabled (players can damage each other) */
  readonly friendlyFireEnabled: boolean;

  /** Whether players can respawn after death */
  readonly allowRespawn: boolean;

  /** Whether the car entity exists in this mode */
  readonly hasCarEntity: boolean;

  /** Whether wave system is active */
  readonly hasWaveSystem: boolean;

  /** Whether bosses can spawn */
  readonly hasBosses: boolean;

  /** Whether survivors can spawn */
  readonly hasSurvivors: boolean;

  /** Minimum number of players required to start */
  readonly minPlayers: number;
}

/**
 * Result of win condition check
 */
export interface WinConditionResult {
  /** Whether the game has ended */
  gameEnded: boolean;

  /** Winner player ID (null for team win or no winner) */
  winnerId: number | null;

  /** Winner display name */
  winnerName: string | null;

  /** Message to display */
  message: string;
}

/**
 * Strategy interface for game mode-specific behavior
 */
export interface IGameModeStrategy {
  /**
   * Get the configuration for this game mode
   */
  getConfig(): GameModeConfig;

  /**
   * Called when a new game starts in this mode
   */
  onGameStart(gameManagers: IGameManagers): void;

  /**
   * Called when the game ends
   */
  onGameEnd(gameManagers: IGameManagers): void;

  /**
   * Called every game tick to update mode-specific logic
   */
  update(deltaTime: number, gameManagers: IGameManagers): void;

  /**
   * Get the spawn position for a player
   */
  getPlayerSpawnPosition(player: Player, gameManagers: IGameManagers): Vector2;

  /**
   * Handle spawning a player - sets the player's position based on the game mode.
   * This is called when a player joins or respawns.
   * @param player The player to spawn
   * @param gameManagers The game managers
   */
  handlePlayerSpawn(player: Player, gameManagers: IGameManagers): void;

  /**
   * Check if a player is allowed to respawn
   */
  canPlayerRespawn(player: Player): boolean;

  /**
   * Check if the game has ended and return the result
   */
  checkWinCondition(gameManagers: IGameManagers): WinConditionResult;

  /**
   * Determine if an attacker should damage a target
   * Used to implement friendly fire logic
   */
  shouldDamageTarget(attacker: IEntity, target: IEntity, attackerId: number): boolean;

  /**
   * Get the fallback target for zombie pathfinding
   * Waves mode returns car location, Battle Royale returns null
   */
  getZombieFallbackTarget(gameManagers: IGameManagers): Vector2 | null;

  // Optional wave system hooks (only used by Waves mode)
  onWaveStart?(waveNumber: number, gameManagers: IGameManagers): void;
  onWaveComplete?(waveNumber: number, gameManagers: IGameManagers): void;
  onPreparationStart?(waveNumber: number, gameManagers: IGameManagers): void;

  /**
   * Get the AI player manager for this game mode (optional).
   * Used for dynamic AI player adjustment when real players join/leave.
   */
  getAIPlayerManager?(): AIPlayerManager | null;

  /**
   * Ensure game mode invariants are maintained after a player disconnects (optional).
   * For example, Infection mode uses this to ensure there's always at least one zombie.
   */
  ensureZombieExists?(gameManagers: IGameManagers): void;
}
