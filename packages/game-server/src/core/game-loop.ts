/**
 * GameLoop - Core game loop and game state management
 *
 * This class handles the main game loop that runs every tick, managing:
 * - Entity updates (movement, AI, physics)
 * - Game state (phase timing for battle royale, game over detection)
 * - Game state broadcasting to clients
 * - Performance tracking
 *
 * The GameLoop is instantiated by GameServer and runs independently,
 * updating entities and managing game flow. It does NOT handle:
 * - Network connections (handled by ServerSocketManager)
 * - Entity creation/removal (handled by EntityManager)
 * - Map generation (handled by MapManager)
 *
 * The loop only runs when isGameReady is true and stops when isGameOver is true.
 * When the game ends, it automatically restarts after 5 seconds.
 */
import { GameOverEvent } from "../../../game-shared/src/events/server-sent/events/game-over-event";
import {
  GameStateEvent,
  GameStateData,
  EntityState,
} from "../../../game-shared/src/events/server-sent/events/game-state-event";
import { GameStartedEvent } from "../../../game-shared/src/events/server-sent/events/game-started-event";
import { GameMessageEvent } from "../../../game-shared/src/events/server-sent/events/game-message-event";
import { GameEvent } from "@shared/events/types";
import { EntityManager } from "@/managers/entity-manager";
import { MapManager } from "@/world/map-manager";
import { ServerSocketManager } from "@/managers/server-socket-manager";
import {
  TICK_RATE,
  TICK_RATE_MS,
  ENABLE_PERFORMANCE_MONITORING,
  DEFAULT_GAME_MODE,
} from "@/config/config";
import { getConfig } from "@shared/config";
import { TickPerformanceTracker } from "@/util/tick-performance-tracker";
import { EnvironmentalEventManager } from "@/managers/environmental-event-manager";
import { IGameModeStrategy, WinConditionResult, createGameModeStrategy } from "@/game-modes";
import type { GameModeId } from "@shared/events/server-sent/events/game-started-event";
import { VotableGameMode, VotingState } from "@shared/types/voting";
export class GameLoop {
  private lastUpdateTime: number = performance.now();
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Phase timer (e.g. battle royale toxic zone countdown) */
  private phaseStartTime: number = Date.now();
  private phaseDuration: number = 0;
  private totalZombies: number = 0;
  private isGameReady: boolean = false;
  private isGameOver: boolean = false;

  // Voting system state
  private isVotingPhase: boolean = false;
  private votingEndTime: number = 0;
  private votes: Map<string, VotableGameMode> = new Map(); // socketId -> vote
  private voteCounts = { open_world: 0, battle_royale: 0, infection: 0 };

  /** True after a full open_world start; used to resume the same map when the server was empty. */
  private openWorldSessionActive: boolean = false;

  private gameModeStrategy: IGameModeStrategy = createGameModeStrategy(DEFAULT_GAME_MODE);

  private tickPerformanceTracker: TickPerformanceTracker;
  private entityManager: EntityManager;
  private mapManager: MapManager;
  private socketManager: ServerSocketManager;
  private environmentalEventManager: EnvironmentalEventManager | null = null;
  private gameManagers: any = null;

  private lastBroadcastedState = {
    phaseStartTime: -1,
    phaseDuration: -1,
    totalZombies: -1,
  };

  constructor(
    tickPerformanceTracker: TickPerformanceTracker,
    entityManager: EntityManager,
    mapManager: MapManager,
    socketManager: ServerSocketManager,
  ) {
    this.tickPerformanceTracker = tickPerformanceTracker;
    this.entityManager = entityManager;
    this.mapManager = mapManager;
    this.socketManager = socketManager;
  }

  /**
   * Set game managers (called after construction to avoid circular dependency)
   */
  public setGameManagers(gameManagers: any): void {
    this.gameManagers = gameManagers;
    this.environmentalEventManager = new EnvironmentalEventManager(
      gameManagers,
      this.entityManager,
      this.mapManager,
    );
  }

  /**
   * Get the current game mode strategy
   */
  public getGameModeStrategy(): IGameModeStrategy {
    return this.gameModeStrategy;
  }

  /**
   * Set the game mode strategy (used to switch game modes)
   */
  public setGameModeStrategy(strategy: IGameModeStrategy): void {
    this.gameModeStrategy = strategy;
  }

  public getPhaseStartTime(): number {
    return this.phaseStartTime;
  }

  public getPhaseDuration(): number {
    return this.phaseDuration;
  }

  public getTotalZombies(): number {
    return this.totalZombies;
  }

  /**
   * Set the phase timer (used by game mode strategies for custom timers)
   */
  public setPhaseTimer(startTime: number, duration: number): void {
    this.phaseStartTime = startTime;
    this.phaseDuration = duration;
  }

  public isOpenWorldSessionActive(): boolean {
    return this.openWorldSessionActive;
  }

  /**
   * First player reconnected after everyone left: keep entities and map, spawn players, re-sync clients.
   */
  public async resumeOpenWorldSession(): Promise<void> {
    this.isGameReady = true;
    this.isGameOver = false;
    this.isVotingPhase = false;
    this.votingEndTime = 0;
    this.votes.clear();
    this.voteCounts = { open_world: 0, battle_royale: 0, infection: 0 };

    await this.socketManager.recreatePlayersForConnectedSockets();

    if (this.gameManagers) {
      this.gameModeStrategy.onGameStart(this.gameManagers);
    }

    const gameMode = this.gameModeStrategy.getConfig().modeId as GameModeId;
    this.socketManager.broadcastEvent(new GameStartedEvent(Date.now(), gameMode));
    this.socketManager.sendInitializationToAllSockets();
  }

  public start(): void {
    this.startGameLoop();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  public async startNewGame(strategy?: IGameModeStrategy): Promise<void> {
    this.openWorldSessionActive = false;

    // Set strategy if provided (used when switching game modes)
    if (strategy) {
      this.gameModeStrategy = strategy;
    }

    this.isGameReady = true;
    this.isGameOver = false;

    // Reset voting state to prevent stale values
    this.isVotingPhase = false;
    this.votingEndTime = 0;
    this.votes.clear();
    this.voteCounts = { open_world: 0, battle_royale: 0, infection: 0 };

    this.phaseStartTime = Date.now();
    this.phaseDuration = 0;
    this.totalZombies = 0;

    // Clear all entities first
    this.entityManager.clear();

    // Reset environmental events (end any active thunderstorms, toxic gas, etc.)
    if (this.environmentalEventManager) {
      this.environmentalEventManager.reset();
    }

    // Generate new map
    this.mapManager.generateMap();

    await this.socketManager.recreatePlayersForConnectedSockets();

    if (this.gameManagers) {
      this.gameModeStrategy.onGameStart(this.gameManagers);
    }

    const gameMode = this.gameModeStrategy.getConfig().modeId as GameModeId;
    this.socketManager.broadcastEvent(new GameStartedEvent(Date.now(), gameMode));
    this.socketManager.sendInitializationToAllSockets();

    if (gameMode === "open_world") {
      this.openWorldSessionActive = true;
    }
  }

  public setIsGameOver(isGameOver: boolean): void {
    this.isGameOver = isGameOver;
  }

  public setIsGameReady(isReady: boolean): void {
    this.isGameReady = isReady;
  }

  public getIsGameReady(): boolean {
    return this.isGameReady;
  }

  public getIsGameOver(): boolean {
    return this.isGameOver;
  }

  // Voting system methods
  public startVotingPhase(): void {
    this.isVotingPhase = true;
    this.votingEndTime = Date.now() + getConfig().voting.VOTING_DURATION;
    this.votes.clear();
    this.voteCounts = { open_world: 0, battle_royale: 0, infection: 0 };
  }

  public registerVote(socketId: string, playerId: number, mode: VotableGameMode): void {
    if (!this.isVotingPhase) return;
    if (getConfig().voting.DISABLED_MODES.includes(mode)) return;

    // Check if player is AI (AI players cannot vote, but zombie players CAN)
    const player = this.entityManager.getEntityById(playerId);
    if (!player) return;
    const serialized = (player as any).serialized;
    if (serialized?.get("isAI")) return;

    // Remove previous vote
    const previousVote = this.votes.get(socketId);
    if (previousVote) {
      this.voteCounts[previousVote]--;
    }

    // Register new vote
    this.votes.set(socketId, mode);
    this.voteCounts[mode]++;
  }

  private getWinningMode(): VotableGameMode {
    const validModes: VotableGameMode[] = ["open_world", "battle_royale", "infection"];
    let maxVotes = -1;
    let winners: VotableGameMode[] = [];

    for (const mode of validModes) {
      // Skip disabled modes
      if (getConfig().voting.DISABLED_MODES.includes(mode)) continue;

      if (this.voteCounts[mode] > maxVotes) {
        maxVotes = this.voteCounts[mode];
        winners = [mode];
      } else if (this.voteCounts[mode] === maxVotes) {
        winners.push(mode);
      }
    }

    // Random selection on tie
    const winner = winners[Math.floor(Math.random() * winners.length)];
    return winner;
  }

  private handleVotingPhase(): void {
    if (!this.isVotingPhase) return;
    if (Date.now() >= this.votingEndTime) {
      this.endVotingPhase();
    }
  }

  private endVotingPhase(): void {
    const winningMode = this.getWinningMode();
    this.isVotingPhase = false;

    void this.startNewGame(createGameModeStrategy(winningMode as GameModeId)).catch((err) => {
      console.error("[GameLoop] startNewGame after voting failed:", err);
    });
  }

  public getVotingState(): VotingState | null {
    if (!this.isVotingPhase) return null;
    return {
      isVotingActive: true,
      votingEndTime: this.votingEndTime,
      votes: { ...this.voteCounts },
      disabledModes: [...getConfig().voting.DISABLED_MODES],
    };
  }

  private startGameLoop(): void {
    this.timer = setInterval(() => {
      // console.profile();
      this.update();
      // console.profileEnd();
    }, 1000 / TICK_RATE);
  }

  private update(): void {
    if (!this.isGameReady) {
      return;
    }

    // Handle voting phase - continue broadcasting state during voting
    if (this.isVotingPhase) {
      this.handleVotingPhase();
      this.broadcastGameState();
      return;
    }

    if (this.isGameOver) {
      return;
    }

    // setup
    const updateStartTime = performance.now();
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;

    // Track updateEntities
    const endUpdateEntities = this.tickPerformanceTracker.startMethod("updateEntities");
    this.updateEntities(deltaTime);
    endUpdateEntities();

    // Update game mode strategy (for mode-specific logic like BR toxic zones)
    if (this.gameManagers) {
      this.gameModeStrategy.update(deltaTime, this.gameManagers);
    }

    // Track handleIfGameOver
    const endHandleIfGameOver = this.tickPerformanceTracker.startMethod("handleIfGameOver");
    this.handleIfGameOver();
    endHandleIfGameOver();

    // Track pruneEntities
    const endPruneEntities = this.tickPerformanceTracker.startMethod("pruneEntities");
    this.entityManager.pruneEntities();
    endPruneEntities();

    // Track broadcastGameState
    const endBroadcastGameState = this.tickPerformanceTracker.startMethod("broadcastGameState");
    this.broadcastGameState();
    endBroadcastGameState();

    // No longer need to track entities - dirty flags handle change detection
    // Dirty flags are cleared in broadcastEvent() after broadcasting

    // Record total tick time and track performance
    const totalTickTime = performance.now() - updateStartTime;
    this.tickPerformanceTracker.recordTick(totalTickTime);

    // Record bandwidth (bytes per second)
    const bandwidth = this.socketManager.getCurrentBandwidth();
    this.tickPerformanceTracker.recordBandwidth(bandwidth);

    this.trackPerformance(updateStartTime);
    this.lastUpdateTime = currentTime;

    // TODO: print all the performance stats for each method and total server tick time averages.
  }

  private handleIfGameOver(): void {
    if (!this.gameManagers) return;

    const result = this.gameModeStrategy.checkWinCondition(this.gameManagers);
    if (result.gameEnded) {
      this.endGame(result);
    }
  }

  public endGame(result?: WinConditionResult): void {
    this.isGameOver = true;

    // Notify strategy of game end
    if (this.gameManagers) {
      this.gameModeStrategy.onGameEnd(this.gameManagers);
    }

    // Broadcast game over event with winner info
    this.socketManager.broadcastEvent(
      new GameOverEvent({
        winnerId: result?.winnerId ?? null,
        winnerName: result?.winnerName ?? null,
        message: result?.message ?? "Game Over",
      }),
    );

    // Check if game modes voting is enabled
    if (getConfig().voting.ENABLE_GAME_MODES) {
      // Start voting phase after showing game over
      setTimeout(() => {
        this.startVotingPhase();
      }, getConfig().voting.GAME_OVER_DISPLAY_DURATION);
    } else {
      setTimeout(() => {
        void this.startNewGame(createGameModeStrategy(DEFAULT_GAME_MODE)).catch((err) => {
          console.error("[GameLoop] startNewGame after game over failed:", err);
        });
      }, 5000);
    }
  }

  private trackPerformance(updateStartTime: number) {
    const updateDuration = performance.now() - updateStartTime;

    // Warn if update took longer than tick rate
    if (updateDuration > TICK_RATE_MS) {
      console.warn(
        `Warning: Slow update detected - took ${updateDuration.toFixed(
          2,
        )}ms (>${TICK_RATE_MS.toFixed(2)}ms threshold)`,
      );
    }
  }

  private updateEntities(deltaTime: number): void {
    this.entityManager.update(deltaTime);
    if (this.environmentalEventManager) {
      this.environmentalEventManager.update(deltaTime);
    }
  }

  private getCurrentGameState(): Record<string, any> {
    const state: Record<string, any> = {
      timestamp: Date.now(),
      phaseStartTime: this.phaseStartTime,
      phaseDuration: this.phaseDuration,
      totalZombies: this.totalZombies,
    };

    // Include voting state when voting is active
    const votingState = this.getVotingState();
    if (votingState) {
      state.votingState = votingState;
    }

    // Include zombie lives state for infection mode
    const zombieLivesState = this.getZombieLivesState();
    if (zombieLivesState) {
      state.zombieLivesState = zombieLivesState;
    }

    return state;
  }

  /**
   * Get zombie lives state for infection mode
   */
  private getZombieLivesState(): { current: number; max: number } | null {
    if (this.gameModeStrategy.getConfig().modeId !== "infection") {
      return null;
    }

    // Access the infection strategy's zombie lives
    const strategy = this.gameModeStrategy as any;
    if (
      typeof strategy.getSharedZombieLives === "function" &&
      typeof strategy.getMaxZombieLives === "function"
    ) {
      return {
        current: strategy.getSharedZombieLives(),
        max: strategy.getMaxZombieLives(),
      };
    }

    return null;
  }

  private broadcastGameState(): void {
    // Don't serialize entities here - let broadcastEvent() handle it with dirty flags
    // Only include state properties that have changed
    const currentState = this.getCurrentGameState();
    const stateUpdate: Partial<GameStateData> & { entities: EntityState[]; timestamp: number } = {
      entities: [], // Entities are handled separately via dirty flags
      timestamp: currentState.timestamp,
    };

    // Compare current state with last broadcasted state using Object.keys
    Object.keys(currentState).forEach((key) => {
      if (key === "timestamp") return;

      const currentValue = currentState[key];
      const lastValue = (this.lastBroadcastedState as any)[key];

      // Always include zombieLivesState and votingState when they exist (they're important for UI)
      // This ensures clients always have the latest values, especially after deaths
      const alwaysInclude = key === "zombieLivesState" || key === "votingState";

      // For objects (like zombieLivesState, votingState), do deep comparison
      let hasChanged = false;
      if (currentValue === null || currentValue === undefined) {
        hasChanged = lastValue !== currentValue;
      } else if (typeof currentValue === "object" && !Array.isArray(currentValue)) {
        // Deep comparison for objects
        if (lastValue === null || lastValue === undefined) {
          hasChanged = true;
        } else {
          // Compare object properties
          const currentKeys = Object.keys(currentValue);
          const lastKeys = Object.keys(lastValue || {});
          if (currentKeys.length !== lastKeys.length) {
            hasChanged = true;
          } else {
            hasChanged = currentKeys.some(
              (k) => (currentValue as any)[k] !== (lastValue as any)[k],
            );
          }
        }
      } else {
        // Primitive comparison
        hasChanged = currentValue !== lastValue;
      }

      // Include if changed OR if it's a state we always include when it exists
      if (hasChanged || (alwaysInclude && currentValue !== null && currentValue !== undefined)) {
        (stateUpdate as any)[key] = currentValue;
        // Deep copy objects to avoid reference issues
        if (
          currentValue !== null &&
          typeof currentValue === "object" &&
          !Array.isArray(currentValue)
        ) {
          (this.lastBroadcastedState as any)[key] = { ...currentValue };
        } else {
          (this.lastBroadcastedState as any)[key] = currentValue;
        }
      }
    });

    const gameStateEvent = new GameStateEvent(stateUpdate);
    this.socketManager.broadcastEvent(gameStateEvent);
  }
}
