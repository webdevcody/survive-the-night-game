/**
 * GameLoop - Core game loop and game state management
 *
 * This class handles the main game loop that runs every tick, managing:
 * - Entity updates (movement, AI, physics)
 * - Wave system (preparation phases, wave transitions, zombie spawning)
 * - Game state (wave number, phase timing, game over detection)
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
import { WaveStartEvent } from "../../../game-shared/src/events/server-sent/events/wave-start-event";
import { GameEvent } from "@shared/events/types";
import { EntityManager } from "@/managers/entity-manager";
import { MapManager } from "@/world/map-manager";
import { ServerSocketManager } from "@/managers/server-socket-manager";
import { TICK_RATE, TICK_RATE_MS } from "@/config/config";
import { getConfig } from "@shared/config";
import { TickPerformanceTracker } from "@/util/tick-performance-tracker";
import { WaveState } from "@shared/types/wave";
import { Survivor } from "@/entities/environment/survivor";
import { Entities } from "@shared/constants";
import { EnvironmentalEventManager } from "@/managers/environmental-event-manager";

export class GameLoop {
  private lastUpdateTime: number = performance.now();
  private timer: ReturnType<typeof setInterval> | null = null;

  // Wave system state
  private waveNumber: number = getConfig().wave.START_WAVE_NUMBER;
  private waveState: WaveState = WaveState.PREPARATION;
  private phaseStartTime: number = Date.now();
  private phaseDuration: number = getConfig().wave.FIRST_WAVE_DELAY;
  private totalZombies: number = 0;
  private isGameReady: boolean = false;
  private isGameOver: boolean = false;

  private tickPerformanceTracker: TickPerformanceTracker;
  private entityManager: EntityManager;
  private mapManager: MapManager;
  private socketManager: ServerSocketManager;
  private environmentalEventManager: EnvironmentalEventManager | null = null;

  private lastBroadcastedState = {
    waveNumber: -1,
    waveState: undefined as WaveState | undefined,
    phaseStartTime: -1,
    phaseDuration: -1,
    totalZombies: -1,
  };

  constructor(
    tickPerformanceTracker: TickPerformanceTracker,
    entityManager: EntityManager,
    mapManager: MapManager,
    socketManager: ServerSocketManager
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
    this.environmentalEventManager = new EnvironmentalEventManager(
      gameManagers,
      this.entityManager,
      this.mapManager
    );
  }

  public getWaveNumber(): number {
    return this.waveNumber;
  }

  public getWaveState(): WaveState {
    return this.waveState;
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

  public start(): void {
    this.startGameLoop();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  public startNewGame(): void {
    this.isGameReady = true;
    this.isGameOver = false;

    // Initialize wave system
    this.waveNumber = getConfig().wave.START_WAVE_NUMBER;
    this.waveState = WaveState.PREPARATION;
    this.phaseStartTime = Date.now();
    this.phaseDuration = getConfig().wave.FIRST_WAVE_DELAY;
    this.totalZombies = 0;

    // Clear all entities first
    this.entityManager.clear();

    // Generate new map
    this.mapManager.generateMap();

    // Recreate players for all connected sockets
    this.socketManager.recreatePlayersForConnectedSockets();

    // Broadcast game started event
    // This tells clients to reset their state and wait for initialization
    this.socketManager.broadcastEvent(new GameStartedEvent());

    // Send initialization data (YOUR_ID + full state) to all sockets
    // This MUST happen AFTER GAME_STARTED so clients receive it after resetting
    this.socketManager.sendInitializationToAllSockets();
  }

  public setIsGameOver(isGameOver: boolean): void {
    this.isGameOver = isGameOver;
  }

  public setIsGameReady(isReady: boolean): void {
    this.isGameReady = isReady;
  }

  private startGameLoop(): void {
    this.timer = setInterval(() => {
      // console.profile();
      this.update();
      // console.profileEnd();
    }, 1000 / TICK_RATE);
  }

  private onPreparationStart(): void {
    console.log(`Preparation for wave ${this.waveNumber} started`);

    // Merchant shop items are now static and don't need to be reset
  }

  private onWaveStart(): void {
    console.log(`Wave ${this.waveNumber} started`);

    // Remove all unrescued survivors at wave start
    const survivors = this.entityManager.getEntitiesByType(Entities.SURVIVOR);
    let removedCount = 0;
    for (const survivor of survivors) {
      if (survivor instanceof Survivor && !survivor.getIsRescued()) {
        this.entityManager.removeEntity(survivor.getId());
        removedCount++;
      }
    }
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} unrescued survivor(s) at wave start`);
    }

    // Spawn crate on even waves (2, 4, 6, etc.) at a random biome
    if (this.waveNumber % 2 === 0) {
      const crateSpawned = this.mapManager.spawnCrateInRandomBiome();
      if (crateSpawned) {
        this.socketManager.broadcastEvent(
          new GameMessageEvent({
            message: `Supply crate dropped at a random location!`,
            color: "green",
          })
        );
      }
    }

    this.mapManager.spawnZombies(this.waveNumber);

    // Notify environmental event manager of wave start
    if (this.environmentalEventManager) {
      this.environmentalEventManager.onWaveStart();
    }

    // Broadcast wave start message
    this.socketManager.broadcastEvent(
      new GameMessageEvent({
        message: `Wave ${this.waveNumber} incoming! Get back to base!`,
        color: "red",
      })
    );

    // Broadcast wave start event for sound
    this.socketManager.broadcastEvent(
      new WaveStartEvent({
        waveNumber: this.waveNumber,
      })
    );
  }

  private onWaveComplete(): void {
    console.log(`Wave ${this.waveNumber} completed`);

    // Broadcast wave complete message
    this.socketManager.broadcastEvent(
      new GameMessageEvent({
        message: `You survived wave ${this.waveNumber}! Start building defenses!`,
        color: "green",
      })
    );

    // Spawn a survivor in a random biome after wave ends
    const survivorSpawned = this.mapManager.spawnSurvivorInRandomBiome();
    if (survivorSpawned) {
      this.socketManager.broadcastEvent(
        new GameMessageEvent({
          message: "A survivor signaled for help, save them!",
          color: "yellow",
        })
      );
    }

    // Check for environmental events
    if (this.environmentalEventManager) {
      console.log(`Checking for environmental events on wave ${this.waveNumber}`);
      this.environmentalEventManager.onWaveComplete(this.waveNumber);
    }

    this.waveNumber++;
  }

  private update(): void {
    if (!this.isGameReady) {
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

    // Track handleWaveSystem
    const endHandleWaveSystem = this.tickPerformanceTracker.startMethod("handleWaveSystem");
    this.handleWaveSystem(deltaTime);
    endHandleWaveSystem();

    // Track environmental events
    if (this.environmentalEventManager) {
      this.environmentalEventManager.update(deltaTime);
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
  }

  private handleWaveSystem(deltaTime: number) {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.phaseStartTime) / 1000;

    switch (this.waveState) {
      case WaveState.PREPARATION:
        // Check if preparation time is up
        if (elapsedTime >= this.phaseDuration) {
          if (getConfig().wave.AUTO_START_WAVES) {
            // Automatically start wave
            console.log(`[WAVE] Preparation complete. Starting Wave ${this.waveNumber}`);
            this.waveState = WaveState.ACTIVE;
            this.phaseStartTime = currentTime;
            this.phaseDuration = getConfig().wave.WAVE_DURATION;
            this.onWaveStart();
          }
        }
        break;

      case WaveState.ACTIVE:
        // Check if wave duration is up
        if (elapsedTime >= this.phaseDuration) {
          // Wave time expired, transition directly to preparation
          console.log(
            `[WAVE] Wave ${this.waveNumber} complete. Starting preparation for Wave ${
              this.waveNumber + 1
            }`
          );
          this.onWaveComplete();
          this.waveState = WaveState.PREPARATION;
          this.phaseStartTime = currentTime;
          this.phaseDuration = getConfig().wave.PREPARATION_DURATION;
          this.onPreparationStart();
        }
        break;

      case WaveState.COMPLETED:
        // This state should not be reached, but handle it just in case
        console.log(`[WAVE] WARNING: COMPLETED state reached, transitioning to PREPARATION`);
        this.waveState = WaveState.PREPARATION;
        this.phaseStartTime = currentTime;
        this.phaseDuration = getConfig().wave.PREPARATION_DURATION;
        this.onPreparationStart();
        break;

      default:
        console.log(`[WAVE] WARNING: Unknown wave state: ${this.waveState}`);
        break;
    }
  }

  private handleIfGameOver(): void {
    const players = this.entityManager.getPlayerEntities();
    if (players.length > 0 && players.every((player) => player.isDead())) {
      this.endGame();
    }
  }

  public endGame(): void {
    console.log("Game over");
    this.isGameOver = true;
    this.socketManager.broadcastEvent(new GameOverEvent());

    // Restart the game after 5 seconds
    setTimeout(() => {
      console.log("Restarting game...");
      this.startNewGame();
    }, 5000);
  }

  private trackPerformance(updateStartTime: number) {
    const updateDuration = performance.now() - updateStartTime;

    // Warn if update took longer than tick rate
    if (updateDuration > TICK_RATE_MS) {
      console.warn(
        `Warning: Slow update detected - took ${updateDuration.toFixed(
          2
        )}ms (>${TICK_RATE_MS.toFixed(2)}ms threshold)`
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
    return {
      timestamp: Date.now(),
      waveNumber: this.waveNumber,
      waveState: this.waveState,
      phaseStartTime: this.phaseStartTime,
      phaseDuration: this.phaseDuration,
      totalZombies: this.totalZombies,
    };
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
      if (
        key !== "timestamp" &&
        currentState[key] !==
          this.lastBroadcastedState[key as keyof typeof this.lastBroadcastedState]
      ) {
        (stateUpdate as any)[key] = currentState[key];
        (this.lastBroadcastedState as any)[key] = currentState[key];
      }
    });

    const gameStateEvent = new GameStateEvent(stateUpdate);
    this.socketManager.broadcastEvent(gameStateEvent);
  }
}
