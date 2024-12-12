import { io, Socket } from "socket.io-client";
import { Events, GameStateEvent, RecipeType } from "@survive-the-night/game-server";

export type EntityDto = { id: string } & any;

export class SocketManager {
  private socket: Socket;

  constructor(
    serverUrl: string,
    handlers: {
      onMap: (map: number[][]) => void;
      onGameStateUpdate: (gameStateEvent: GameStateEvent) => void;
      onYourId: (playerId: string) => void;
    }
  ) {
    this.socket = io(serverUrl);

    this.socket.on(Events.GAME_STATE_UPDATE, (gameState: { entities: EntityDto[] }) => {
      const gameStateEvent = new GameStateEvent(gameState);
      handlers.onGameStateUpdate(gameStateEvent);
    });

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

  public sendInput(input: { dx: number; dy: number; interact: boolean; fire: boolean }) {
    this.socket.emit(Events.PLAYER_INPUT, input);
  }
}
