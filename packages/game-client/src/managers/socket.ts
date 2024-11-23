import { io, Socket } from "socket.io-client";
import { Entity, Events, GameStateEvent } from "@survive-the-night/game-server";
import { GameState } from "@/state";

export type EntityDto = { id: string } & any;

export class SocketManager {
  private socket: Socket;

  constructor(
    serverUrl: string,
    handlers: {
      onGameStateUpdate: (gameStateEvent: GameStateEvent) => void;
      onConnect: (playerId: string) => void;
      onYourId: (playerId: string) => void;
    }
  ) {
    this.socket = io(serverUrl);

    this.socket.on(Events.GAME_STATE_UPDATE, (gameState: { entities: EntityDto[] }) => {
      const gameStateEvent = new GameStateEvent(gameState);
      handlers.onGameStateUpdate(gameStateEvent);
    });

    this.socket.on(Events.YOUR_ID, (playerId: string) => {
      handlers.onYourId(playerId);
    });

    this.socket.on("connect", () => {
      handlers.onConnect(this.getId()!);
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from game server");
    });
  }

  public getId(): string | undefined {
    return this.socket.id;
  }

  public sendInput(input: { dx: number; dy: number; harvest: boolean; fire: boolean }) {
    this.socket.emit(Events.PLAYER_INPUT, input);
  }
}
