import { GameClient } from "@/client";
import { GameState } from "@/state";
import { ClientSocketManager } from "@/managers/client-socket-manager";
import { InterpolationManager } from "@/managers/interpolation";
import type { GameStateEvent } from "../../../game-shared/src/events/server-sent/events/game-state-event";
export interface ClientEventContext {
  gameClient: GameClient;
  socketManager: ClientSocketManager;
  gameState: GameState;
  shouldProcessEntityEvent: () => boolean;
  requestFullState: (reason?: string) => void;
  invalidateInitialState: (reason?: string) => void;
}

export interface InitializationContext extends ClientEventContext {
  interpolation: InterpolationManager;
  hasReceivedPlayerId: boolean;
  hasReceivedInitialState: boolean;
  /** Live flag (not a snapshot) — use after flushing pending full state in YOUR_ID handler */
  hasReceivedInitialStateLive: () => boolean;
  setHasReceivedPlayerId: (value: boolean) => void;
  setHasReceivedInitialState: (value: boolean, reason?: string) => void;
  /** Full state received before YOUR_ID is stored and replayed after player id is known */
  queuePendingFullState: (event: GameStateEvent) => void;
  flushPendingFullStateAfterYourId: () => void;
  checkInitialization: () => void;
  /**
   * Resets initialization state and requests fresh player ID + full game state.
   * Used when reconnecting or when a new game starts (players get new entity IDs).
   */
  resetAndRequestInitialization: (reason: string) => void;
}
