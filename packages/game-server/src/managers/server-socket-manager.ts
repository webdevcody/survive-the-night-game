import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { ClientSentEvents, ServerSentEvents } from "../shared/events/events";
import { EntityManager } from "./entity-manager";
import { MapManager } from "./map-manager";
import { Input } from "../shared/input";
import { Player } from "../shared/entities/player";
import { RecipeType } from "../shared/recipes";
import { GameEvent } from "../shared/events/types";
import { DEBUG_EVENTS } from "../config/debug";
import Positionable from "../shared/extensions/positionable";
import { GameServer } from "../server";
import { Broadcaster, IEntityManager } from "./types";

/**
 * Any and all functionality related to sending server side events
 * or listening for client side events should live here.
 */
export class ServerSocketManager implements Broadcaster {
  private io: Server;
  private players: Map<string, Player> = new Map();
  private port: number;
  private httpServer: any;
  private entityManager?: IEntityManager;
  private mapManager?: MapManager;
  private gameServer: GameServer;

  constructor(port: number, gameServer: GameServer) {
    this.port = port;
    this.httpServer = createServer();
    this.io = new Server(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.gameServer = gameServer;

    this.io.on("connection", (socket: Socket) => this.onConnection(socket));
  }

  public getEntityManager(): IEntityManager {
    if (!this.entityManager) {
      throw new Error("Entity manager not set");
    }
    return this.entityManager;
  }

  public getMapManager(): MapManager {
    if (!this.mapManager) {
      throw new Error("Map manager not set");
    }
    return this.mapManager;
  }

  public setEntityManager(entityManager: IEntityManager): void {
    this.entityManager = entityManager;
  }

  public setMapManager(mapManager: MapManager): void {
    this.mapManager = mapManager;
  }

  public listen(): void {
    this.io.listen(this.port);
  }

  private onDisconnect(socket: Socket): void {
    const player = this.players.get(socket.id);
    this.players.delete(socket.id);
    if (player) {
      this.getEntityManager().markEntityForRemoval(player);
    }

    if (this.players.size === 0) {
      this.getMapManager().generateMap();
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

    const totalPlayers = this.getEntityManager().getPlayerEntities().length;
    if (totalPlayers === 0) {
      this.gameServer.startNewGame();
    }

    const player = new Player(this.getEntityManager(), this);

    const map = this.getMapManager().getMap();
    const centerX = (map.length * 16) / 2;
    const centerY = (map[0].length * 16) / 2;
    player.getExt(Positionable).setPosition({ x: centerX, y: centerY });

    this.players.set(socket.id, player);
    this.getEntityManager().addEntity(player);

    socket.emit(ServerSentEvents.MAP, map);
    socket.emit(ServerSentEvents.YOUR_ID, player.getId());

    socket.on(ClientSentEvents.PLAYER_INPUT, (input: Input) => this.onPlayerInput(socket, input));
    socket.on(ClientSentEvents.CRAFT_REQUEST, (recipe: RecipeType) =>
      this.onCraftRequest(socket, recipe)
    );
    socket.on(ClientSentEvents.START_CRAFTING, (recipe: RecipeType) =>
      this.setPlayerCrafting(socket, true)
    );
    socket.on(ClientSentEvents.STOP_CRAFTING, (recipe: RecipeType) =>
      this.setPlayerCrafting(socket, false)
    );

    socket.on("disconnect", () => {
      this.onDisconnect(socket);
    });
  }

  public broadcastEvent(event: GameEvent<any>): void {
    if (DEBUG_EVENTS && event.getType() !== ServerSentEvents.GAME_STATE_UPDATE) {
      console.log(`Broadcasting event: ${event.getType()}`);
    }
    this.io.emit(event.getType(), event.serialize());
  }
}
