import { GameState } from "@/shared/types/game-state";
import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";

export class GameStateEvent implements GameEvent<GameState> {
  private type: EventType;
  private gameState: GameState;

  constructor(gameState: GameState) {
    this.type = ServerSentEvents.GAME_STATE_UPDATE;
    this.gameState = gameState;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): GameState {
    return this.gameState;
  }

  getGameState(): GameState {
    return this.gameState;
  }

  deserialize(data: any): GameStateEvent {
    return new GameStateEvent(data);
  }
}
