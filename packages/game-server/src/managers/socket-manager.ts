import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { Events, IEvent } from "@/shared/events";
import { EntityManager } from "./entity-manager";
import { MapManager } from "./map-manager";
import { Input } from "@/server";
import { Player } from "@/shared/entities/player";

export class SocketManager {
  private io: Server;
  private entityManager: EntityManager;
  private mapManager: MapManager;
  private players: Map<string, Player> = new Map();

  constructor(entityManager: EntityManager, mapManager: MapManager, port: number) {
    this.entityManager = entityManager;
    this.mapManager = mapManager;

    const httpServer = createServer();
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.io.on("connection", (socket: Socket) => this.onConnection(socket));

    httpServer.listen(port);
  }

  private onDisconnect(socket: Socket): void {
    const player = this.players.get(socket.id);
    this.players.delete(socket.id);
    if (player) {
      this.entityManager.markEntityForRemoval(player);
    }

    if (this.players.size === 0) {
      this.mapManager.loadMap("testing");
    }
  }

  // TODO: I feel like this should live in the player entity itself?
  private onPlayerInput(socket: Socket, input: Input): void {
    const player = this.players.get(socket.id);

    if (player) {
      player.setVelocityFromInput(input.dx, input.dy);
      player.setInput(input);

      if (input.harvest) {
        const nearbyEntities = this.entityManager.getNearbyEntities(player.getPosition(), 10);
        const harvestableEntities = this.entityManager.filterHarvestableEntities(nearbyEntities);
        const first = harvestableEntities[0];
        if (first) {
          first.harvest();
        }
      }
    }
  }

  private onConnection(socket: Socket): void {
    console.log(`Player connected: ${socket.id}`);

    const player = new Player(this.entityManager);
    this.players.set(socket.id, player);
    this.entityManager.addEntity(player);

    socket.emit(Events.YOUR_ID, player.getId());

    socket.on("playerInput", (input: Input) => this.onPlayerInput(socket, input));

    socket.on("disconnect", () => {
      this.onDisconnect(socket);
    });
  }

  public broadcastEvent(event: IEvent): void {
    this.io.emit(event.getType(), event.getPayload());
  }
}
