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
}

export interface InitializationContext extends ClientEventContext {
  interpolation: InterpolationManager;
  previousWaveState: WaveState | undefined;
  pendingFullStateEvent: GameStateEvent | null;
  hasReceivedMap: boolean;
  hasReceivedPlayerId: boolean;
  hasReceivedInitialState: boolean;
  setHasReceivedMap: (value: boolean) => void;
  setHasReceivedPlayerId: (value: boolean) => void;
  setHasReceivedInitialState: (value: boolean) => void;
  setPendingFullStateEvent: (event: GameStateEvent | null) => void;
  setPreviousWaveState: (state: WaveState | undefined) => void;
  processPendingFullStateIfReady: () => void;
  checkInitialization: () => void;
}
