import { GameOverEvent } from "@shared/events/server-sent/game-over-event";
import { GameStateEvent } from "@shared/events/server-sent/game-state-event";
import { CommandManager } from "@/managers/command-manager";
import { EntityManager } from "@/managers/entity-manager";
import { GameManagers } from "@/managers/game-managers";
import { MapManager } from "@/managers/map-manager";
import { ServerSocketManager } from "@/managers/server-socket-manager";
import { FPS, NIGHT_DURATION, PERFORMANCE_LOG_INTERVAL, TICK_RATE_MS } from "./config";
import { DAY_DURATION } from "./config";

export class GameServer {
  private lastUpdateTime: number = Date.now();
  private entityManager: EntityManager;
  private mapManager: MapManager;
  private socketManager: ServerSocketManager;
  private timer: ReturnType<typeof setInterval> | null = null;
  private dayNumber: number = 1;
  private cycleStartTime: number = Date.now();
  private cycleDuration: number = DAY_DURATION;
  private isDay: boolean = true;
  private updateTimes: number[] = [];
  private lastPerformanceLog: number = Date.now();
  private isGameOver: boolean = false;
  private gameManagers: GameManagers;
  private commandManager: CommandManager;
  private lastBroadcastedState = {
    dayNumber: -1,
    cycleStartTime: -1,
    cycleDuration: -1,
    isDay: undefined as boolean | undefined,
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

  constructor(port: number = 3001) {
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
    this.isGameOver = false;
    this.dayNumber = 1;
    this.cycleStartTime = Date.now();
    this.cycleDuration = DAY_DURATION;
    this.isDay = true;

    // Track initial game state
    const initialGameState = {
      dayNumber: this.dayNumber,
      cycleStartTime: this.cycleStartTime,
      cycleDuration: this.cycleDuration,
      isDay: this.isDay,
    };
    this.entityManager.getEntityStateTracker().trackGameState(initialGameState);

    this.mapManager.generateMap();
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private startGameLoop(): void {
    this.timer = setInterval(() => {
      this.update();
    }, 1000 / FPS);
  }

  private onDayStart(): void {
    console.log("Day started");
  }

  private onNightStart(): void {
    console.log("Night started");
    this.mapManager.spawnZombies(this.dayNumber);
  }

  public setIsGameOver(isGameOver: boolean): void {
    this.isGameOver = isGameOver;
  }

  private update(): void {
    // setup
    const updateStartTime = performance.now();
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;

    // logic
    if (this.isGameOver) {
      return;
    }

    this.updateEntities(deltaTime);

    this.handleDayNightCycle(deltaTime);
    this.handleIfGameOver();

    // cleanup
    this.entityManager.pruneEntities();
    this.broadcastGameState();
    this.trackPerformance(updateStartTime, currentTime);
    this.lastUpdateTime = currentTime;

    // Track all entities for next update's change detection
    const entities = this.entityManager.getEntities();
    const filteredEntities = entities.filter((entity) => !("isServerOnly" in entity));
    filteredEntities.forEach((entity) => {
      this.entityManager.getEntityStateTracker().trackEntity(entity);
    });
  }

  private handleDayNightCycle(deltaTime: number) {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.cycleStartTime) / 1000;

    if (elapsedTime >= this.cycleDuration) {
      this.isDay = !this.isDay;
      this.cycleStartTime = currentTime;
      this.cycleDuration = this.isDay ? DAY_DURATION : NIGHT_DURATION;
      this.dayNumber += this.isDay ? 1 : 0;

      // Track the game state changes immediately
      const currentGameState = {
        dayNumber: this.dayNumber,
        cycleStartTime: this.cycleStartTime,
        cycleDuration: this.cycleDuration,
        isDay: this.isDay,
      };
      this.entityManager.getEntityStateTracker().trackGameState(currentGameState);

      if (this.isDay) {
        console.log(`Day ${this.dayNumber} started`);
        this.onDayStart();
      } else {
        console.log(`Night ${this.dayNumber} started`);
        this.onNightStart();
      }
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
    }
  }

  private updateEntities(deltaTime: number): void {
    this.entityManager.update(deltaTime);
  }

  // TODO: This is a bit of a hack to get the game state to the client.
  // We should probably have a more elegant way to do this.
  private broadcastGameState(): void {
    const rawEntities = [...this.entityManager.getEntities()]
      .filter((entity) => !("isServerOnly" in entity))
      .map((entity) => entity.serialize());

    // Only include state properties that have changed
    const stateUpdate: any = {
      entities: rawEntities,
      timestamp: Date.now(),
    };

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
}

const gameServer = new GameServer();

process.on("SIGINT", () => gameServer.stop());
