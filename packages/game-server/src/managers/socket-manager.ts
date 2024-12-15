import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { Events, IEvent } from "../shared/events.js";
import { EntityManager } from "./entity-manager.js";
import { MapManager } from "./map-manager.js";
import { Input } from "../server.js";
import { Player } from "../shared/entities/player.js";
import { RecipeType } from "@/shared/recipes.js";

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
      this.mapManager.generateMap();
    }
  }

  private onCraftRequest(socket: Socket, recipe: RecipeType): void {
    const player = this.players.get(socket.id);

    if (player) {
      player.craftRecipe(recipe);
    }
  }

  private onPlayerInput(socket: Socket, input: Input): void {
    const player = this.players.get(socket.id);
    if (!player) return;
    player.setVelocityFromInput(input.dx, input.dy);
    player.setInput(input);
  }

  private setPlayerCrafting(socket: Socket, isCrafting: boolean): void {
    const player = this.players.get(socket.id);
    if (!player) return;
    player.setIsCrafting(isCrafting);
  }

  private onConnection(socket: Socket): void {
    console.log(`Player connected: ${socket.id}`);

    const player = new Player(this.entityManager);

    const map = this.mapManager.getMap();
    const centerX = (map.length * 16) / 2;
    const centerY = (map[0].length * 16) / 2;
    player.setPosition({ x: centerX, y: centerY });

    this.players.set(socket.id, player);
    this.entityManager.addEntity(player);

    socket.emit(Events.MAP, map);
    socket.emit(Events.YOUR_ID, player.getId());

    socket.on("playerInput", (input: Input) => this.onPlayerInput(socket, input));
    socket.on(Events.CRAFT_REQUEST, (recipe: RecipeType) => this.onCraftRequest(socket, recipe));
    socket.on(Events.START_CRAFTING, (recipe: RecipeType) => this.setPlayerCrafting(socket, true));
    socket.on(Events.STOP_CRAFTING, (recipe: RecipeType) => this.setPlayerCrafting(socket, false));

    socket.on("disconnect", () => {
      this.onDisconnect(socket);
    });
  }

  public broadcastEvent(event: IEvent): void {
    this.io.emit(event.getType(), event.getPayload());
  }
}
