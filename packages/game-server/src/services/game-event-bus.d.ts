import { EventEmitter } from "events";
/**
 * Internal game event types for server-side processing
 * These are separate from WebSocket events sent to clients
 */
export declare enum GameEventType {
    ZOMBIE_KILLED = "zombie_killed"
}
export interface ZombieKilledEventData {
    zombieEntityId: number;
    killerEntityId: number;
    timestamp: number;
}
/**
 * Internal event bus for game server events
 * Used to decouple game logic from external services (API calls, analytics, etc.)
 */
declare class GameEventBus extends EventEmitter {
    private static instance;
    static getInstance(): GameEventBus;
    /**
     * Emit a zombie killed event
     */
    emitZombieKilled(data: ZombieKilledEventData): void;
    /**
     * Subscribe to zombie killed events
     */
    onZombieKilled(handler: (data: ZombieKilledEventData) => void): void;
    /**
     * Unsubscribe from zombie killed events
     */
    offZombieKilled(handler: (data: ZombieKilledEventData) => void): void;
}
export declare const gameEventBus: GameEventBus;
export {};
