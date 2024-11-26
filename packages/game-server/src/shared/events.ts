import { RawEntity } from "./entities";

export const Events = {
  GAME_STATE_UPDATE: "gameState",
  PLAYER_INPUT: "playerInput",
  YOUR_ID: "yourId",
} as const;

export type Event = (typeof Events)[keyof typeof Events];

type GameState = {
  entities: RawEntity[];
};

export class GameStateEvent implements IEvent {
  private type: Event;
  private gameState: GameState;

  constructor(gameState: GameState) {
    this.type = Events.GAME_STATE_UPDATE;
    this.gameState = gameState;
  }

  getType(): Event {
    return this.type;
  }

  getPayload(): GameState {
    return this.gameState;
  }

  serialize(): any {
    return this.gameState;
  }

  deserialize(data: any): IEvent {
    return new GameStateEvent(data);
  }
}

export interface IEvent {
  getType(): Event;
  getPayload(): any;
  serialize(): any;
  deserialize(data: any): IEvent;
}
