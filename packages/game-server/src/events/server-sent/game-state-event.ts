import { EventType, ServerSentEvents } from "@/events/events";
import { GameEvent } from "@/events/types";
import { GameState } from "@shared/geom/game-state";

export class GameStateEvent implements GameEvent<GameState> {
  private readonly type: EventType;
  private readonly gameState: GameState;

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
}
