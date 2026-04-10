import { GameEvent } from "@shared/events/types";
import { GameLoop } from "./game-loop";
export declare class GameServer {
    private performanceTracker;
    private tickPerformanceTracker;
    private gameManagers;
    private entityManager;
    private mapManager;
    private socketManager;
    private gameLoop;
    constructor(port?: number);
    /**
     * Generate/load the map and start the simulation, then accept WebSocket clients.
     * Call once after construction (see {@code server.ts}).
     */
    bootstrap(): Promise<void>;
    startNewGame(): Promise<void>;
    stop(): void;
    /** Persist open-world last tiles (and binds) for every connected player to the website DB. */
    persistConnectedPlayersLastPositions(): Promise<void>;
    broadcastEvent<T>(event: GameEvent<T>): void;
    sendGameMessageToPlayerEntity(playerEntityId: number, message: string, color?: string): void;
    getPhaseStartTime(): number;
    getPhaseDuration(): number;
    getTotalZombies(): number;
    setIsGameReady(isReady: boolean): void;
    getGameLoop(): GameLoop;
}
