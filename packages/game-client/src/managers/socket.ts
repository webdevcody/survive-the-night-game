import { io, Socket } from "socket.io-client";
import { Entity, Events } from "@survive-the-night/game-server";

export type EntityDto = { id: string } & any;

export class SocketManager {
  private socket: Socket;

  constructor(
    serverUrl: string,
    handlers: {
      onGameStateUpdate: (entities: Entity[]) => void;
      onEntityRemoval: (id: string) => void;
    }
  ) {
    this.socket = io(serverUrl);

    this.socket.on(Events.GAME_STATE_UPDATE, (entities: EntityDto[]) => {
      handlers.onGameStateUpdate(entities);
    });

    this.socket.on(Events.ENTITY_REMOVAL, (id: string) => {
      handlers.onEntityRemoval(id);
    });

    this.socket.on("connect", () => {
      console.log("Connected to game server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from game server");
    });
  }

  public getId(): string | undefined {
    return this.socket.id;
  }

  public sendInput(input: { dx: number; dy: number }) {
    this.socket.emit(Events.PLAYER_INPUT, input);
  }
}
