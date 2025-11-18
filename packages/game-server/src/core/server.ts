/**
 * GameServer - Main server orchestrator and public API
 *
 * This class is the top-level coordinator for the game server. It:
 * - Initializes all managers (EntityManager, MapManager, ServerSocketManager, etc.)
 * - Creates and starts the GameLoop
 * - Provides the public API for game control (startNewGame, endGame, etc.)
 * - Delegates game loop operations to GameLoop
 * - Handles server lifecycle (startup, shutdown)
 *
 * GameServer vs GameLoop:
 * - GameServer: Orchestrates managers, handles initialization, provides public API
 * - GameLoop: Runs the game tick loop, manages wave system, updates entities
 *
 * The GameServer instance is created in server.ts (the entry point) and should
 * only be instantiated once. It coordinates between all subsystems but doesn't
 * contain game logic itself - that's handled by GameLoop.
 */
import { ServerUpdatingEvent } from "../../../game-shared/src/events/server-sent/events/server-updating-event";
import { GameEvent } from "@shared/events/types";
import { CommandManager } from "@/managers/command-manager";
import { EntityManager } from "@/managers/entity-manager";
import { GameManagers } from "@/managers/game-managers";
import { MapManager } from "@/world/map-manager";
import { ServerSocketManager } from "@/managers/server-socket-manager";
import { PerformanceTracker } from "@/util/performance";
import { TickPerformanceTracker } from "@/util/tick-performance-tracker";
import { GameLoop } from "./game-loop";

export class GameServer {
  // UTILS
  private performanceTracker: PerformanceTracker;
  private tickPerformanceTracker: TickPerformanceTracker;

  // MANAGERS
  private gameManagers: GameManagers;
  private commandManager: CommandManager;
  private entityManager: EntityManager;
  private mapManager: MapManager;
  private socketManager: ServerSocketManager;
  private gameLoop: GameLoop;

  constructor(port: number = 3001) {
    this.performanceTracker = new PerformanceTracker();
    this.tickPerformanceTracker = new TickPerformanceTracker();

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
    this.entityManager.setTickPerformanceTracker(this.tickPerformanceTracker);
    this.mapManager.setGameManagers(this.gameManagers);
    this.socketManager.setCommandManager(this.commandManager);
    this.socketManager.setEntityManager(this.entityManager);
    this.socketManager.setMapManager(this.mapManager);
    this.socketManager.setGameManagers(this.gameManagers);
    this.socketManager.setTickPerformanceTracker(this.tickPerformanceTracker);
    this.socketManager.listen();

    this.gameLoop = new GameLoop(
      this.tickPerformanceTracker,
      this.entityManager,
      this.mapManager,
      this.socketManager
    );
    this.gameLoop.start();
  }

  public startNewGame(): void {
    this.gameLoop.startNewGame();
  }

  public stop() {
    this.gameLoop.stop();
  }

  public broadcastEvent<T>(event: GameEvent<T>): void {
    this.socketManager.broadcastEvent(event);
  }

  public getWaveNumber(): number {
    return this.gameLoop.getWaveNumber();
  }

  public getWaveState() {
    return this.gameLoop.getWaveState();
  }

  public getPhaseStartTime(): number {
    return this.gameLoop.getPhaseStartTime();
  }

  public getPhaseDuration(): number {
    return this.gameLoop.getPhaseDuration();
  }

  public getTotalZombies(): number {
    return this.gameLoop.getTotalZombies();
  }

  public setIsGameOver(isGameOver: boolean): void {
    this.gameLoop.setIsGameOver(isGameOver);
  }

  public setIsGameReady(isReady: boolean): void {
    this.gameLoop.setIsGameReady(isReady);
  }

  public endGame(): void {
    this.gameLoop.endGame();
  }
}
