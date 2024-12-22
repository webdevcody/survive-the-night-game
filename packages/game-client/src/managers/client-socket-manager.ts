import { io, Socket } from "socket.io-client";
import {
  Events,
  Input,
  RecipeType,
  ServerSentEvents,
  GameStateEvent,
  PlayerDeathEvent,
} from "@survive-the-night/game-server";

export type EntityDto = { id: string } & any;

const SERVER_EVENT_MAP = {
  [ServerSentEvents.GAME_STATE_UPDATE]: GameStateEvent,
  [ServerSentEvents.PLAYER_DEATH]: PlayerDeathEvent,
} as const;

type ServerEvent = (typeof SERVER_EVENT_MAP)[keyof typeof SERVER_EVENT_MAP];

export class ClientSocketManager {
  private socket: Socket;

  public on<K extends keyof typeof SERVER_EVENT_MAP>(
    eventType: K,
    handler: (event: SERVER_EVENT_MAP[K]) => void
  ) {
    this.socket.on(eventType, (serializedEvent: any) => {
      const event = new SERVER_EVENT_MAP[eventType](serializedEvent);
      handler(event);
    });
  }

  constructor(
    serverUrl: string,
    handlers: {
      onMap: (map: number[][]) => void;
      onYourId: (playerId: string) => void;
    }
  ) {
    this.socket = io(serverUrl);

    this.socket.on(Events.MAP, (map: number[][]) => {
      handlers.onMap(map);
    });

    this.socket.on(Events.YOUR_ID, (playerId: string) => {
      handlers.onYourId(playerId);
    });

    this.socket.on("connect", () => {
      // handlers.onConnect(this.getId()!);
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from game server");
    });
  }

  public sendCraftRequest(recipe: RecipeType) {
    this.socket.emit(Events.CRAFT_REQUEST, recipe);
  }

  public sendStartCrafting() {
    this.socket.emit(Events.START_CRAFTING);
  }

  public sendStopCrafting() {
    this.socket.emit(Events.STOP_CRAFTING);
  }

  public sendInput(input: Input) {
    this.socket.emit(Events.PLAYER_INPUT, input);
  }
}
