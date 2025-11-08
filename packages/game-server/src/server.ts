import { GameOverEvent } from "@shared/events/server-sent/game-over-event";
import { GameStateEvent } from "@shared/events/server-sent/game-state-event";
import { GameStartedEvent } from "@shared/events/server-sent/game-started-event";
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
    zombiesRemaining: -1,
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

  public getZombiesRemaining(): number {
    return this.entityManager
      .getZombieEntities()
      .filter((zombie) => zombie.hasExt(Destructible) && !zombie.getExt(Destructible).isDead())
      .length;
  }

  constructor(port: number = 3001) {
    this.performanceTracker = new PerformanceTracker();

    this.socketManager = new ServerSocketManager(port, this);
    this.entityManager = new EntityManager();
    this.mapManager = new MapManager();
    this.commandManager = new CommandManager(this.entityManager);
    this.gameManagers = new GameManagers(this.entityManager, this.mapManager, this.socketManager);

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
    this.totalZombies = this.getZombiesRemaining();
  }

  private onWaveComplete(): void {
    console.log(`Wave ${this.waveNumber} completed`);
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

    // an update is averaging 4.1 ms, we can improve this
    // this.performanceTracker.trackStart("updateEntities");
    this.updateEntities(deltaTime);
    // this.performanceTracker.trackEnd("updateEntities");

    this.handleWaveSystem(deltaTime);
    this.handleIfGameOver();

    this.entityManager.pruneEntities();

    // BEFORE REFACTORING
    // {
    //   mean: 5.425483800000007,
    //   median: 5.651458500000217,
    //   stdDev: 1.2973845897338345
    // }
    // this.performanceTracker.trackStart("broadcastGameState");
    this.broadcastGameState();
    // this.performanceTracker.trackEnd("broadcastGameState");

    // this.performanceTracker.trackStart("trackEntity");
    for (const entity of this.entityManager.getDynamicEntities()) {
      this.entityManager.getEntityStateTracker().trackEntity(entity, currentTime);
    }
    // this.performanceTracker.trackEnd("trackEntity");

    // print the final performance metrics over time
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

  private endGame(): void {
    console.log("Game over");
    this.isGameOver = true;
    this.socketManager.broadcastEvent(new GameOverEvent());

    // Restart the game after 5 seconds
    setTimeout(() => {
      console.log("Restarting game...");
      this.entityManager.clear();
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
      const slowUpdates = this.updateTimes.filter((time) => time > TICK_RATE_MS).length;
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

  // TODO: This is a bit of a hack to get the game state to the client.
  // We should probably have a more elegant way to do this.
  private broadcastGameState(): void {
    const rawEntities = [...this.entityManager.getDynamicEntities()].map((entity) =>
      entity.serialize()
    );

    // Only include state properties that have changed
    const stateUpdate: any = {
      entities: rawEntities,
      timestamp: Date.now(),
    };

    // Wave system state (new)
    if (this.waveNumber !== this.lastBroadcastedState.waveNumber) {
      stateUpdate.waveNumber = this.waveNumber;
      this.lastBroadcastedState.waveNumber = this.waveNumber;
    }

    if (this.waveState !== this.lastBroadcastedState.waveState) {
      stateUpdate.waveState = this.waveState;
      this.lastBroadcastedState.waveState = this.waveState;
    }

    if (this.phaseStartTime !== this.lastBroadcastedState.phaseStartTime) {
      stateUpdate.phaseStartTime = this.phaseStartTime;
      this.lastBroadcastedState.phaseStartTime = this.phaseStartTime;
    }

    if (this.phaseDuration !== this.lastBroadcastedState.phaseDuration) {
      stateUpdate.phaseDuration = this.phaseDuration;
      this.lastBroadcastedState.phaseDuration = this.phaseDuration;
    }

    const currentZombiesRemaining = this.getZombiesRemaining();
    if (currentZombiesRemaining !== this.lastBroadcastedState.zombiesRemaining) {
      stateUpdate.zombiesRemaining = currentZombiesRemaining;
      this.lastBroadcastedState.zombiesRemaining = currentZombiesRemaining;
    }

    if (this.totalZombies !== this.lastBroadcastedState.totalZombies) {
      stateUpdate.totalZombies = this.totalZombies;
      this.lastBroadcastedState.totalZombies = this.totalZombies;
    }

    // Legacy day/night cycle state (for backwards compatibility)
    if (this.dayNumber !== this.lastBroadcastedState.dayNumber) {
      stateUpdate.dayNumber = this.dayNumber;
      this.lastBroadcastedState.dayNumber = this.dayNumber;
    }

    if (this.cycleStartTime !== this.lastBroadcastedState.cycleStartTime) {
      stateUpdate.cycleStartTime = this.cycleStartTime;
      this.lastBroadcastedState.cycleStartTime = this.cycleStartTime;
    }

    if (this.cycleDuration !== this.lastBroadcastedState.cycleDuration) {
      stateUpdate.cycleDuration = this.cycleDuration;
      this.lastBroadcastedState.cycleDuration = this.cycleDuration;
    }

    if (this.isDay !== this.lastBroadcastedState.isDay) {
      stateUpdate.isDay = this.isDay;
      this.lastBroadcastedState.isDay = this.isDay;
    }

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
