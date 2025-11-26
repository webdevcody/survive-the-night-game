import { GameClient } from "@/client";
import { GameState } from "@/state";
import { ClientSocketManager } from "@/managers/client-socket-manager";
import { InterpolationManager } from "@/managers/interpolation";
import { GameStateEvent } from "../../../game-shared/src/events/server-sent/events/game-state-event";
import { WaveState } from "@shared/types/wave";

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
  previousWaveState: WaveState | undefined;
  hasReceivedPlayerId: boolean;
  hasReceivedInitialState: boolean;
  setHasReceivedPlayerId: (value: boolean) => void;
  setHasReceivedInitialState: (value: boolean, reason?: string) => void;
  setPreviousWaveState: (state: WaveState | undefined) => void;
  checkInitialization: () => void;
  /**
   * Resets initialization state and requests fresh player ID + full game state.
   * Used when reconnecting or when a new game starts (players get new entity IDs).
   */
  resetAndRequestInitialization: (reason: string) => void;
}
