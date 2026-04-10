/**
 * GameLoop - Core game loop and game state management
 *
 * This class handles the main game loop that runs every tick, managing:
 * - Entity updates (movement, AI, physics)
 * - Game state (phase timing, etc.)
 * - Game state broadcasting to clients
 * - Performance tracking
 *
 * The GameLoop is instantiated by GameServer and runs independently,
 * updating entities and managing game flow. It does NOT handle:
 * - Network connections (handled by ServerSocketManager)
 * - Entity creation/removal (handled by EntityManager)
 * - Map generation (handled by MapManager)
 *
 * The loop only runs simulation when isGameReady is true (false while a session is
 * being (re)loaded).
 */
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
} from "@/config/config";
import { TickPerformanceTracker } from "@/util/tick-performance-tracker";
import { IGameModeStrategy, createGameModeStrategy } from "@/game-modes";
import type { GameModeId } from "@shared/events/server-sent/events/game-started-event";
export class GameLoop {
  private lastUpdateTime: number = performance.now();
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Phase timer (e.g. battle royale toxic zone countdown) */
  private phaseStartTime: number = Date.now();
  private phaseDuration: number = 0;
  private totalZombies: number = 0;
  private isGameReady: boolean = false;

  /** True after a full open_world start; used to resume the same map when the server was empty. */
  private openWorldSessionActive: boolean = false;

  private gameModeStrategy: IGameModeStrategy = createGameModeStrategy();

  private tickPerformanceTracker: TickPerformanceTracker;
  private entityManager: EntityManager;
  private mapManager: MapManager;
  private socketManager: ServerSocketManager;
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
    this.isGameReady = false;

    await this.socketManager.recreatePlayersForConnectedSockets();

    if (this.gameManagers) {
      this.gameModeStrategy.onGameStart(this.gameManagers);
    }

    const gameMode = this.gameModeStrategy.getConfig().modeId as GameModeId;
    this.socketManager.broadcastEvent(new GameStartedEvent(Date.now(), gameMode));
    this.socketManager.sendInitializationToAllSockets();
    this.isGameReady = true;
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

    if (strategy) {
      this.gameModeStrategy = strategy;
    }

    this.isGameReady = false;

    this.phaseStartTime = Date.now();
    this.phaseDuration = 0;
    this.totalZombies = 0;

    // Delta broadcasts compare against this; reset so the first tick after reload does not use
    // pre-reload phase/zombie snapshots (and so entity deltas are not driven by stale dirty sets).
    this.lastBroadcastedState = {
      phaseStartTime: -1,
      phaseDuration: -1,
      totalZombies: -1,
    };

    // Clear all entities first
    this.entityManager.clear();

    // Generate new map
    this.mapManager.generateMap();

    await this.socketManager.recreatePlayersForConnectedSockets();
    this.socketManager.reconcileConnectedPlayersQuestStateWithMap();

    if (this.gameManagers) {
      this.gameModeStrategy.onGameStart(this.gameManagers);
    }

    const gameMode = this.gameModeStrategy.getConfig().modeId as GameModeId;
    this.socketManager.broadcastEvent(new GameStartedEvent(Date.now(), gameMode));
    this.socketManager.sendInitializationToAllSockets();

    this.openWorldSessionActive = true;
    this.isGameReady = true;
  }

  public setIsGameReady(isReady: boolean): void {
    this.isGameReady = isReady;
  }

  public getIsGameReady(): boolean {
    return this.isGameReady;
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

    // setup
    const updateStartTime = performance.now();
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;

    // Track updateEntities
    const endUpdateEntities = this.tickPerformanceTracker.startMethod("updateEntities");
    this.updateEntities(deltaTime);
    endUpdateEntities();

    if (this.gameManagers) {
      this.gameModeStrategy.update(deltaTime, this.gameManagers);
    }

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
  }

  private getCurrentGameState(): Record<string, any> {
    const state: Record<string, any> = {
      timestamp: Date.now(),
      phaseStartTime: this.phaseStartTime,
      phaseDuration: this.phaseDuration,
      totalZombies: this.totalZombies,
    };

    return state;
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

      // For objects, do deep comparison
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

      if (hasChanged) {
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
