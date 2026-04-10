import { EntityManager } from "@/managers/entity-manager";
import { MapManager } from "@/world/map-manager";
import { ServerSocketManager } from "@/managers/server-socket-manager";
import { TickPerformanceTracker } from "@/util/tick-performance-tracker";
import { IGameModeStrategy, WinConditionResult } from "@/game-modes";
export declare class GameLoop {
    private lastUpdateTime;
    private timer;
    /** Phase timer (e.g. battle royale toxic zone countdown) */
    private phaseStartTime;
    private phaseDuration;
    private totalZombies;
    private isGameReady;
    private isGameOver;
    /** True after a full open_world start; used to resume the same map when the server was empty. */
    private openWorldSessionActive;
    private gameModeStrategy;
    private tickPerformanceTracker;
    private entityManager;
    private mapManager;
    private socketManager;
    private gameManagers;
    private lastBroadcastedState;
    constructor(tickPerformanceTracker: TickPerformanceTracker, entityManager: EntityManager, mapManager: MapManager, socketManager: ServerSocketManager);
    /**
     * Set game managers (called after construction to avoid circular dependency)
     */
    setGameManagers(gameManagers: any): void;
    /**
     * Get the current game mode strategy
     */
    getGameModeStrategy(): IGameModeStrategy;
    /**
     * Set the game mode strategy (used to switch game modes)
     */
    setGameModeStrategy(strategy: IGameModeStrategy): void;
    getPhaseStartTime(): number;
    getPhaseDuration(): number;
    getTotalZombies(): number;
    /**
     * Set the phase timer (used by game mode strategies for custom timers)
     */
    setPhaseTimer(startTime: number, duration: number): void;
    isOpenWorldSessionActive(): boolean;
    /**
     * First player reconnected after everyone left: keep entities and map, spawn players, re-sync clients.
     */
    resumeOpenWorldSession(): Promise<void>;
    start(): void;
    stop(): void;
    startNewGame(strategy?: IGameModeStrategy): Promise<void>;
    setIsGameOver(isGameOver: boolean): void;
    setIsGameReady(isReady: boolean): void;
    getIsGameReady(): boolean;
    getIsGameOver(): boolean;
    private startGameLoop;
    private update;
    private handleIfGameOver;
    endGame(result?: WinConditionResult): void;
    private trackPerformance;
    private updateEntities;
    private getCurrentGameState;
    private broadcastGameState;
}
