import { RawEntity } from "./entities";

export const Events = {
  CRAFT_REQUEST: "craftRequest",
  GAME_STATE_UPDATE: "gameState",
  PLAYER_INPUT: "playerInput",
  MAP: "map",
  YOUR_ID: "yourId",
  START_CRAFTING: "startCrafting",
  STOP_CRAFTING: "stopCrafting",
  PLAYER_DEATH: "playerDeath",
  SCATTER_LOOT: "scatterLoot",
  INTERACT: "interact",
} as const;

export type Event = (typeof Events)[keyof typeof Events];

type GameState = {
  entities: RawEntity[];
  dayNumber: number;
  untilNextCycle: number;
  isDay: boolean;
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

export class PlayerDeathEvent implements IEvent {
  private type: Event;
  private playerId: string;

  constructor(playerId: string) {
    this.type = Events.PLAYER_DEATH;
    this.playerId = playerId;
  }

  getType(): Event {
    return this.type;
  }

  getPayload(): string {
    return this.playerId;
  }

  serialize(): any {
    return this.playerId;
  }

  deserialize(data: any): IEvent {
    return new PlayerDeathEvent(data);
  }
}
