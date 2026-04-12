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

/** Context passed to buffer apply after init gating (live fields from ClientEventListener). */
export interface GameStateUpdateContext {
  gameClient: GameClient;
  gameState: GameState;
  interpolation: InterpolationManager;
  hasReceivedPlayerId: boolean;
  hasReceivedInitialState: boolean;
  setHasReceivedInitialState: (value: boolean, reason?: string) => void;
  checkInitialization: () => void;
}

export interface InitializationContext extends ClientEventContext, GameStateUpdateContext {
  setHasReceivedPlayerId: (value: boolean) => void;
  /** Full state received before YOUR_ID; replayed once identity is known */
  queuePendingFullState: (event: GameStateEvent) => void;
  flushPendingFullStateAfterYourId: () => void;
  resetAndRequestInitialization: (reason: string) => void;
}
