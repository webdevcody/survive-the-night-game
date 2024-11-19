import { io, Socket } from "socket.io-client";
import { Entity } from "../entities/entity";

export const Events = {
  PLAYER_INPUT: "playerInput",
};

export class SocketManager {
  private socket: Socket;

  constructor(
    serverUrl: string,
    handlers: { onGameStateUpdate: (entities: Entity[]) => void }
  ) {
    this.socket = io(serverUrl);

    // Listen for game state updates
    this.socket.on("gameState", (entities: Entity[]) => {
      handlers.onGameStateUpdate(entities);
    });

    // Handle connection events
    this.socket.on("connect", () => {
      console.log("Connected to game server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from game server");
    });
  }

  public sendInput(input: { dx: number; dy: number }) {
    this.socket.emit(Events.PLAYER_INPUT, input);
  }
}
