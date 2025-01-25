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
import { TICK_RATE, NIGHT_DURATION, PERFORMANCE_LOG_INTERVAL, TICK_RATE_MS } from "./config/config";
import { DAY_DURATION } from "./config/config";
import Destructible from "@/extensions/destructible";

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

  private onDayStart(): void {
    console.log("Day started");

    // Kill all zombies
    const zombies = this.entityManager.getZombieEntities();
    zombies.forEach((zombie) => {
      const destructable = zombie.getExt(Destructible);
      if (destructable) {
        destructable.kill();
      }
    });

    // Revive all dead players
    const players = this.entityManager.getPlayerEntities();
    players.forEach((player) => {
      if (player.isDead()) {
        player.revive();
      }
    });
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
    const entities = this.entityManager.getDynamicEntities();
    const now = Date.now();
    for (let entity of entities) {
      this.entityManager.getEntityStateTracker().trackEntity(entity, now);
    }
  }

  private handleDayNightCycle(deltaTime: number) {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.cycleStartTime) / 1000;

    if (elapsedTime >= this.cycleDuration) {
      this.isDay = !this.isDay;
      this.cycleStartTime = currentTime;
      this.cycleDuration = this.isDay ? DAY_DURATION : NIGHT_DURATION;
      this.dayNumber += this.isDay ? 1 : 0;

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
    }
  }

  private updateEntities(deltaTime: number): void {
    this.entityManager.update(deltaTime);
  }

  // TODO: This is a bit of a hack to get the game state to the client.
  // We should probably have a more elegant way to do this.
  private broadcastGameState(): void {
    const rawEntities = this.entityManager.getDynamicEntities().map((entity) => entity.serialize());

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
