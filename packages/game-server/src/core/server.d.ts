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
    startNewGame(): Promise<void>;
    stop(): void;
    broadcastEvent<T>(event: GameEvent<T>): void;
    sendGameMessageToPlayerEntity(playerEntityId: number, message: string, color?: string): void;
    getPhaseStartTime(): number;
    getPhaseDuration(): number;
    getTotalZombies(): number;
    setIsGameOver(isGameOver: boolean): void;
    setIsGameReady(isReady: boolean): void;
    endGame(): void;
    getGameLoop(): GameLoop;
}
