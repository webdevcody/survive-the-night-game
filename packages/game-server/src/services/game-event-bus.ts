import { EventEmitter } from "events";

/**
 * Internal game event types for server-side processing
 * These are separate from WebSocket events sent to clients
 */
export enum GameEventType {
  ZOMBIE_KILLED = "zombie_killed",
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
class GameEventBus extends EventEmitter {
  private static instance: GameEventBus;

  static getInstance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus();
    }
    return GameEventBus.instance;
  }

  /**
   * Emit a zombie killed event
   */
  emitZombieKilled(data: ZombieKilledEventData): void {
    this.emit(GameEventType.ZOMBIE_KILLED, data);
  }

  /**
   * Subscribe to zombie killed events
   */
  onZombieKilled(handler: (data: ZombieKilledEventData) => void): void {
    this.on(GameEventType.ZOMBIE_KILLED, handler);
  }

  /**
   * Unsubscribe from zombie killed events
   */
  offZombieKilled(handler: (data: ZombieKilledEventData) => void): void {
    this.off(GameEventType.ZOMBIE_KILLED, handler);
  }
}

export const gameEventBus = GameEventBus.getInstance();
