import { GameOverEvent } from "@shared/events/server-sent/game-over-event";
import {
  GameStateEvent,
  GameStateData,
  EntityState,
} from "@shared/events/server-sent/game-state-event";
import { GameStartedEvent } from "@shared/events/server-sent/game-started-event";
import { GameMessageEvent } from "@shared/events/server-sent/game-message-event";
import { ServerUpdatingEvent } from "@shared/events/server-sent/server-updating-event";
import { GameEvent } from "@shared/events/types";
import { CommandManager } from "@/managers/command-manager";
import { EntityManager } from "@/managers/entity-manager";
import { GameManagers } from "@/managers/game-managers";
import { MapManager } from "@/managers/map-manager";
import { ServerSocketManager } from "@/managers/server-socket-manager";
import { TICK_RATE, PERFORMANCE_LOG_INTERVAL, TICK_RATE_MS } from "./config/config";
import { getConfig } from "@shared/config";
import Destructible from "@/extensions/destructible";
import { PerformanceTracker } from "./util/performance";
import { WaveState } from "@shared/types/wave";
import { perfTimer } from "@shared/util/performance";

export class GameServer {
  // STATE
  private lastUpdateTime: number = Date.now();
  private timer: ReturnType<typeof setInterval> | null = null;
  // Wave system state
  private waveNumber: number = 1;
  private waveState: WaveState = WaveState.PREPARATION;
  private phaseStartTime: number = Date.now();
  private phaseDuration: number = getConfig().wave.FIRST_WAVE_DELAY;
  private totalZombies: number = 0;
  // Legacy day/night cycle state (for backwards compatibility)
  private dayNumber: number = 1;
  private cycleStartTime: number = Date.now();
  private cycleDuration: number = getConfig().dayNight.DAY_DURATION;
  private isDay: boolean = true;
  private isGameReady: boolean = false;
  private isGameOver: boolean = false;
  private updateTimes: number[] = [];
  private lastPerformanceLog: number = Date.now();

  // UTILS
  private performanceTracker: PerformanceTracker;

  // MANAGERS
  private gameManagers: GameManagers;
  private commandManager: CommandManager;
  private entityManager: EntityManager;
  private mapManager: MapManager;
  private socketManager: ServerSocketManager;
  private lastBroadcastedState = {
    dayNumber: -1,
    cycleStartTime: -1,
    cycleDuration: -1,
    isDay: undefined as boolean | undefined,
    waveNumber: -1,
    waveState: undefined as WaveState | undefined,
    phaseStartTime: -1,
    phaseDuration: -1,
    totalZombies: -1,
  };

  public getDayNumber(): number {
    return this.dayNumber;
  }

  public getCycleStartTime(): number {
    return this.cycleStartTime;
  }

  public getCycleDuration(): number {
    return this.cycleDuration;
  }

  public getIsDay(): boolean {
    return this.isDay;
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

  constructor(port: number = 3001) {
    this.performanceTracker = new PerformanceTracker();

    this.socketManager = new ServerSocketManager(port, this);
    this.entityManager = new EntityManager();
    this.mapManager = new MapManager();
    this.commandManager = new CommandManager(this.entityManager);
    this.gameManagers = new GameManagers(
      this.entityManager,
      this.mapManager,
      this.socketManager,
      this
    );

    this.entityManager.setGameManagers(this.gameManagers);
    this.mapManager.setGameManagers(this.gameManagers);
    this.socketManager.setCommandManager(this.commandManager);
    this.socketManager.setEntityManager(this.entityManager);
    this.socketManager.setMapManager(this.mapManager);
    this.socketManager.setGameManagers(this.gameManagers);
    this.socketManager.listen();

    this.startGameLoop();
  }

  public startNewGame(): void {
    this.isGameReady = true;
    this.isGameOver = false;

    // Initialize wave system
    this.waveNumber = 1;
    this.waveState = WaveState.PREPARATION;
    this.phaseStartTime = Date.now();
    this.phaseDuration = getConfig().wave.FIRST_WAVE_DELAY;
    this.totalZombies = 0;

    // Legacy day/night cycle (kept for compatibility)
    this.dayNumber = 1;
    this.cycleStartTime = Date.now();
    this.cycleDuration = getConfig().dayNight.DAY_DURATION;
    this.isDay = false; // Always night now

    // Clear all entities first
    this.entityManager.clear();

    // Generate new map
    this.mapManager.generateMap();

    // Recreate players for all connected sockets
    this.socketManager.recreatePlayersForConnectedSockets();

    // Broadcast game started event
    this.socketManager.broadcastEvent(new GameStartedEvent());
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
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

    // Reset merchant shop items
    const merchants = this.entityManager.getMerchantEntities();
    merchants.forEach((merchant) => {
      if (merchant.randomizeShopItems) {
        merchant.randomizeShopItems();
      }
    });
  }

  private onWaveStart(): void {
    console.log(`Wave ${this.waveNumber} started`);
    this.mapManager.spawnZombies(this.waveNumber);

    // Broadcast wave start message
    this.socketManager.broadcastEvent(
      new GameMessageEvent({
        message: `Wave ${this.waveNumber} incoming! Get back to base!`,
        color: "red",
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

    // Spawn crates at wave end
    this.mapManager.spawnCrates(getConfig().wave.CRATES_SPAWNED_PER_WAVE);

    // Broadcast crate spawn message
    const crateCount = getConfig().wave.CRATES_SPAWNED_PER_WAVE;
    this.socketManager.broadcastEvent(
      new GameMessageEvent({
        message: `${crateCount} supply crate${crateCount > 1 ? "s" : ""} dropped nearby!`,
        color: "green",
      })
    );

    this.waveNumber++;
  }

  public setIsGameOver(isGameOver: boolean): void {
    this.isGameOver = isGameOver;
  }

  public setIsGameReady(isReady: boolean): void {
    this.isGameReady = isReady;
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
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;

    // slow
    this.updateEntities(deltaTime);

    this.handleWaveSystem(deltaTime);

    this.handleIfGameOver();

    this.entityManager.pruneEntities();

    // slow
    perfTimer.start("broadcastGameState");
    this.broadcastGameState();
    perfTimer.end("broadcastGameState");
    perfTimer.logStats("broadcastGameState");

    // No longer need to track entities - dirty flags handle change detection
    // Dirty flags are cleared in broadcastEvent() after broadcasting

    this.trackPerformance(updateStartTime, currentTime);
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

  private trackPerformance(updateStartTime: number, currentTime: number) {
    const updateDuration = performance.now() - updateStartTime;
    this.updateTimes.push(updateDuration);

    // Warn if update took longer than tick rate
    if (updateDuration > TICK_RATE_MS) {
      console.warn(
        `Warning: Slow update detected - took ${updateDuration.toFixed(
          2
        )}ms (>${TICK_RATE_MS.toFixed(2)}ms threshold)`
      );
    }

    // Log performance stats every PERFORMANCE_LOG_INTERVAL ms
    if (currentTime - this.lastPerformanceLog > PERFORMANCE_LOG_INTERVAL) {
      const avgUpdateTime = this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length;
      const maxUpdateTime = Math.max(...this.updateTimes);
      let slowUpdates = 0;
      for (const time of this.updateTimes) {
        if (time > TICK_RATE_MS) {
          slowUpdates++;
        }
      }
      console.log(`Performance stats:
        Avg update time: ${avgUpdateTime.toFixed(2)}ms
        Max update time: ${maxUpdateTime.toFixed(2)}ms
        Total Entities: ${this.entityManager.getEntities().length}
        Updates tracked: ${this.updateTimes.length}
        Slow updates: ${slowUpdates} (${((slowUpdates / this.updateTimes.length) * 100).toFixed(
        1
      )}%)
      `);

      // Reset tracking
      this.updateTimes = [];
      this.lastPerformanceLog = currentTime;

      this.performanceTracker.printAllStats();
    }
  }

  private updateEntities(deltaTime: number): void {
    this.entityManager.update(deltaTime);
  }

  private getCurrentGameState(): Record<string, any> {
    return {
      timestamp: Date.now(),
      waveNumber: this.waveNumber,
      waveState: this.waveState,
      phaseStartTime: this.phaseStartTime,
      phaseDuration: this.phaseDuration,
      totalZombies: this.totalZombies,
      // Legacy day/night cycle state (for backwards compatibility)
      dayNumber: this.dayNumber,
      cycleStartTime: this.cycleStartTime,
      cycleDuration: this.cycleDuration,
      isDay: this.isDay,
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

  public broadcastEvent<T>(event: GameEvent<T>): void {
    this.socketManager.broadcastEvent(event);
  }
}

const gameServer = new GameServer();

process.on("SIGINT", () => gameServer.stop());
process.on("SIGTERM", () => {
  console.log("Server updating...");
  gameServer.broadcastEvent(new ServerUpdatingEvent());
  gameServer.stop();
});
