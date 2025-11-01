import { Player } from "@/entities/player";
import { ServerSentEvents, ClientSentEvents } from "@shared/events/events";
import { GameEvent } from "@shared/events/types";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import { GameServer } from "@/server";
import { AdminCommand } from "@shared/commands/commands";
import { Input } from "../../../game-shared/src/util/input";
import { RecipeType } from "../../../game-shared/src/util/recipes";
import { ItemType } from "@shared/util/inventory";
import Vector2 from "@/util/vector2";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import express from "express";
import biomeRoutes from "../api/biome-routes.js";
import { CommandManager } from "@/managers/command-manager";
import { MapManager } from "@/managers/map-manager";
import { Broadcaster, IEntityManager, IGameManagers } from "@/managers/types";
import { GameStateEvent } from "@shared/events/server-sent/game-state-event";
import { PlayerJoinedEvent } from "@shared/events/server-sent/player-joined-event";
import { PongEvent } from "@shared/events/server-sent/pong-event";
import { ChatMessageEvent } from "@shared/events/server-sent/chat-message-event";
import { PlayerLeftEvent } from "@/events/server-sent/player-left-event";
import { SIMULATED_SERVER_LATENCY_MS } from "@/config/simulation";
import { DelayedServer, DelayedServerSocket } from "@/util/delayed-socket";
import { createCommandRegistry, CommandRegistry } from "@/commands";
import { Filter } from "bad-words";

/**
 * Any and all functionality related to sending server side events
 * or listening for client side events should live here.
 */
export class ServerSocketManager implements Broadcaster {
  private io: Server;
  private delayedIo: DelayedServer;
  private players: Map<string, Player> = new Map();
  private playerDisplayNames: Map<string, string> = new Map();
  private port: number;
  private httpServer: any;
  private entityManager?: IEntityManager;
  private mapManager?: MapManager;
  private gameServer: GameServer;
  private commandManager?: CommandManager;
  private gameManagers?: IGameManagers;
  private chatCommandRegistry: CommandRegistry;
  private badWordsFilter: Filter;

  constructor(port: number, gameServer: GameServer) {
    this.port = port;

    // Set up Express app
    const app = express();

    // Add middleware
    app.use(express.json());
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      if (req.method === "OPTIONS") {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Register API routes (biome editor only available in development)
    if (process.env.NODE_ENV !== "production") {
      console.log("Registering biome routes at /api (development mode)");
      app.use("/api", biomeRoutes);
    } else {
      console.log("Biome editor disabled in production mode");
    }

    // Add a test route to verify Express is working
    app.get("/test", (req, res) => {
      res.json({ message: "Express is working!" });
    });

    // Create HTTP server with Express app
    this.httpServer = createServer(app);

    // Wrap HTTP server with Socket.io
    this.io = new Server(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    // Wrap the io server with DelayedServer to handle latency simulation
    this.delayedIo = new DelayedServer(this.io, SIMULATED_SERVER_LATENCY_MS);

    this.gameServer = gameServer;

    // Initialize chat command registry
    this.chatCommandRegistry = createCommandRegistry();

    // Initialize bad words filter
    this.badWordsFilter = new Filter();

    this.io.on("connection", (socket: Socket) => {
      const { displayName } = socket.handshake.query;

      // Filter bad words and replace with asterisks
      const filteredDisplayName = displayName
        ? this.badWordsFilter.clean(displayName as string)
        : undefined;

      // Allow multiple connections with the same display name
      // Each connection gets its own player entity
      this.playerDisplayNames.set(socket.id, filteredDisplayName || "Unknown");
      this.onConnection(socket);
    });
  }

  /**
   * Wrap a socket with DelayedServerSocket for latency simulation
   */
  private wrapSocket(socket: Socket): DelayedServerSocket {
    return new DelayedServerSocket(socket, SIMULATED_SERVER_LATENCY_MS);
  }

  public setGameManagers(gameManagers: IGameManagers): void {
    this.gameManagers = gameManagers;
  }

  public getGameManagers(): IGameManagers {
    if (!this.gameManagers) {
      throw new Error("Game managers not set");
    }
    return this.gameManagers;
  }

  public setCommandManager(commandManager: CommandManager): void {
    this.commandManager = commandManager;
  }

  public getCommandManager(): CommandManager {
    if (!this.commandManager) {
      throw new Error("Command manager not set");
    }
    return this.commandManager;
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

  public recreatePlayersForConnectedSockets(): void {
    // Clear existing player map
    this.players.clear();

    // Get all connected sockets
    const sockets = Array.from(this.io.sockets.sockets.values());

    // Create new players for each connected socket
    sockets.forEach((socket) => {
      const player = new Player(this.getGameManagers());
      player.setDisplayName(this.playerDisplayNames.get(socket.id) ?? "Unknown");

      // Position player at random grass location
      const spawnPosition = this.getMapManager().getRandomGrassPosition();
      player.getExt(Positionable).setPosition(spawnPosition);

      // Add to player map and entity manager
      this.players.set(socket.id, player);
      this.getEntityManager().addEntity(player);

      // Send map and player ID to client
      const mapData = this.getMapManager().getMapData();
      const delayedSocket = this.wrapSocket(socket);
      delayedSocket.emit(ServerSentEvents.MAP, mapData);
      delayedSocket.emit(ServerSentEvents.YOUR_ID, player.getId());
      this.broadcastEvent(
        new PlayerJoinedEvent({ playerId: player.getId(), displayName: player.getDisplayName() })
      );
    });
  }

  public listen(): void {
    // Listen using the HTTP server directly (which has Express attached)
    this.httpServer.listen(this.port, () => {
      console.log(`Server listening on port ${this.port}`);
    });
  }

  private onDisconnect(socket: Socket): void {
    console.log("Player disconnected", socket.id);
    const player = this.players.get(socket.id);
    const displayName = this.playerDisplayNames.get(socket.id);

    // Clean up player and displayName
    this.players.delete(socket.id);
    this.playerDisplayNames.delete(socket.id);

    if (player) {
      // TODO: this is a hacker; I'd rather use this, but when I do there is a strange race condition where the round never restarts, so instead the
      this.getEntityManager().removeEntity(player.getId());
      // this.getEntityManager().markEntityForRemoval(player);
      this.broadcastEvent(
        new PlayerLeftEvent({
          playerId: player.getId(),
          displayName: displayName ?? "Unknown",
        })
      );
    }

    const isLastPlayer = this.players.size === 0;
    if (isLastPlayer) {
      this.gameServer.setIsGameReady(false);
    }
  }

  private onCraftRequest(socket: Socket, recipe: RecipeType): void {
    const player = this.players.get(socket.id);

    if (player) {
      player.craftRecipe(recipe);
    }
  }

  private onMerchantBuy(socket: Socket, data: { merchantId: string; itemIndex: number }): void {
    const player = this.players.get(socket.id);
    if (!player) return;

    // Find the merchant entity
    const merchant = this.getEntityManager().getEntityById(data.merchantId);
    if (!merchant || merchant.getType() !== "merchant") return;

    // Get the shop items from the merchant
    const shopItems = merchant.getShopItems?.();
    if (!shopItems || data.itemIndex < 0 || data.itemIndex >= shopItems.length) return;

    const selectedItem = shopItems[data.itemIndex];
    const playerCoins = player.getCoins();

    // Check if player has enough coins
    if (playerCoins < selectedItem.price) {
      console.log(
        `Player ${player.getId()} tried to buy ${
          selectedItem.itemType
        } but doesn't have enough coins`
      );
      return;
    }

    // Deduct coins
    player.addCoins(-selectedItem.price);

    // Create the item
    const item = { itemType: selectedItem.itemType as ItemType };
    const inventory = player.getExt(Inventory);

    // Add to inventory or drop on ground
    if (inventory.isFull()) {
      // Drop item 32 pixels down from player
      const playerPos = player.getExt(Positionable).getPosition();
      const dropPosition = new Vector2(playerPos.x, playerPos.y + 32);
      const droppedEntity = this.getEntityManager().createEntityFromItem(item);
      droppedEntity.getExt(Positionable).setPosition(dropPosition);
      console.log(`Dropped ${selectedItem.itemType} on ground for player ${player.getId()}`);
    } else {
      inventory.addItem(item);
      console.log(
        `Player ${player.getId()} bought ${selectedItem.itemType} for ${selectedItem.price} coins`
      );
    }
  }

  private onPlayerInput(socket: Socket, input: Input): void {
    const player = this.players.get(socket.id);
    if (!player) return;
    player.setInput(input);
  }

  private setPlayerCrafting(socket: Socket, isCrafting: boolean): void {
    const player = this.players.get(socket.id);
    if (!player) return;
    player.setIsCrafting(isCrafting);
  }

  private sendFullState(socket: Socket): void {
    const entities = this.getEntityManager().getEntities();
    const filteredEntities = entities.filter((entity) => !("isServerOnly" in entity));

    const delayedSocket = this.wrapSocket(socket);
    delayedSocket.emit(ServerSentEvents.GAME_STATE_UPDATE, {
      entities: filteredEntities.map((entity) => entity.serialize()),
      timestamp: Date.now(),
      isFullState: true,
      dayNumber: this.gameServer.getDayNumber(),
      cycleStartTime: this.gameServer.getCycleStartTime(),
      cycleDuration: this.gameServer.getCycleDuration(),
      isDay: this.gameServer.getIsDay(),
    });
  }

  private setupSocketListeners(socket: Socket): void {
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
    socket.on(ClientSentEvents.ADMIN_COMMAND, (command: AdminCommand) =>
      this.getCommandManager().handleCommand(command)
    );
    socket.on(ClientSentEvents.SET_DISPLAY_NAME, (displayName: string) =>
      this.setPlayerDisplayName(socket, displayName)
    );
    socket.on(ClientSentEvents.MERCHANT_BUY, (data: { merchantId: string; itemIndex: number }) =>
      this.onMerchantBuy(socket, data)
    );
    socket.on(ClientSentEvents.REQUEST_FULL_STATE, () => this.sendFullState(socket));
    socket.on(ClientSentEvents.PING, (timestamp: number) => {
      this.handlePing(socket, timestamp);
    });
    socket.on(ClientSentEvents.SEND_CHAT, (data: { message: string }) => {
      this.handleChat(socket, data.message);
    });
    socket.on("disconnect", () => {
      this.onDisconnect(socket);
    });
  }

  private setPlayerDisplayName(socket: Socket, displayName: string): void {
    const player = this.players.get(socket.id);
    if (!player) return;
    if (displayName.length > 12) {
      displayName = displayName.substring(0, 12);
    }
    // Filter bad words and replace with asterisks
    const filteredDisplayName = this.badWordsFilter.clean(displayName);
    player.setDisplayName(filteredDisplayName);
  }

  private onConnection(socket: Socket): void {
    console.log(`Player connected: ${socket.id} - ${this.playerDisplayNames.get(socket.id)}`);

    // Set up socket event listeners first
    this.setupSocketListeners(socket);

    const totalPlayers = this.getEntityManager()
      .getPlayerEntities()
      .filter((entity) => !(entity as Player).isMarkedForRemoval()).length;

    if (totalPlayers === 0) {
      console.log("Starting new game");
      this.gameServer.startNewGame();
      // Don't return early, let the map data be sent below
    }

    // If we didn't just create a new game, create a new player
    if (totalPlayers !== 0) {
      const player = new Player(this.getGameManagers());
      player.setDisplayName(this.playerDisplayNames.get(socket.id) ?? "Unknown");

      // Position player at random grass location
      const spawnPosition = this.getMapManager().getRandomGrassPosition();
      player.getExt(Positionable).setPosition(spawnPosition);

      this.players.set(socket.id, player);
      this.getEntityManager().addEntity(player);

      const delayedSocket = this.wrapSocket(socket);
      delayedSocket.emit(ServerSentEvents.YOUR_ID, player.getId());
      this.broadcastEvent(
        new PlayerJoinedEvent({ playerId: player.getId(), displayName: player.getDisplayName() })
      );
    }

    // Always send the map data
    const mapData = this.getMapManager().getMapData();
    const delayedSocket = this.wrapSocket(socket);
    delayedSocket.emit(ServerSentEvents.MAP, mapData);
  }

  public broadcastEvent(event: GameEvent<any>): void {
    if (event.getType() === ServerSentEvents.GAME_STATE_UPDATE) {
      const entities = this.getEntityManager().getEntities();
      const filteredEntities = entities.filter((entity) => !("isServerOnly" in entity));
      const entityStateTracker = this.getEntityManager().getEntityStateTracker();
      const changedEntities = entityStateTracker.getChangedEntities(filteredEntities);
      const removedEntityIds = entityStateTracker.getRemovedEntityIds();

      if (changedEntities.length === 0 && removedEntityIds.length === 0) {
        return; // No changes to broadcast
      }

      // For each changed entity, only include properties that have actually changed
      const changedEntityData = changedEntities.map((entity) => {
        const currentState = entity.serialize();
        const previousState = entityStateTracker.getPreviousEntityState(entity.getId());

        if (!previousState) {
          // If no previous state exists, this is a new entity - track it and send full state
          entityStateTracker.trackEntity(entity, Date.now());
          return currentState;
        }

        // Create a delta object with only changed properties
        const delta: any = {
          id: entity.getId(),
          type: entity.getType(), // Always include type for safety
        };

        // Compare and include changed properties
        for (const [key, value] of Object.entries(currentState)) {
          if (key === "id") continue; // Skip id as it's already included

          if (key === "extensions" && Array.isArray(value)) {
            const prevExtensions = previousState[key] || [];
            // Only include extensions that actually changed
            const changedExtensions = [];

            for (const ext of value) {
              const prevExt = prevExtensions.find((pe: any) => pe.type === ext.type);
              if (!prevExt) {
                // New extension, include it
                changedExtensions.push(ext);
                continue;
              }

              // Deep compare extension properties excluding type
              const extCopy = { ...ext };
              const prevExtCopy = { ...prevExt };
              delete extCopy.type;
              delete prevExtCopy.type;

              if (JSON.stringify(extCopy) !== JSON.stringify(prevExtCopy)) {
                changedExtensions.push(ext); // Only include this extension if it changed
              }
            }

            // Check for removed extensions
            const removedExtensions = prevExtensions
              .filter((pe: any) => !value.find((e: any) => e.type === pe.type))
              .map((pe: any) => pe.type);

            if (changedExtensions.length > 0) {
              delta.extensions = changedExtensions; // Only include changed extensions
            }

            if (removedExtensions.length > 0) {
              delta.removedExtensions = removedExtensions;
            }
          } else if (JSON.stringify(previousState[key]) !== JSON.stringify(value)) {
            delta[key] = value;
          }
        }

        return delta;
      });

      // Get current game state
      const currentGameState = {
        dayNumber: this.gameServer.getDayNumber(),
        cycleStartTime: this.gameServer.getCycleStartTime(),
        cycleDuration: this.gameServer.getCycleDuration(),
        isDay: this.gameServer.getIsDay(),
      };

      // Get only changed game state properties
      const changedGameState = entityStateTracker.getChangedGameStateProperties(currentGameState);

      const gameStateEvent = new GameStateEvent({
        entities: changedEntityData,
        removedEntityIds,
        isFullState: false,
        timestamp: Date.now(),
        ...changedGameState,
      });

      // Track the current state of all entities and game state after sending the update
      changedEntities.forEach((entity) => {
        entityStateTracker.trackEntity(entity, Date.now());
      });
      entityStateTracker.trackGameState(currentGameState);

      this.delayedIo.emit(gameStateEvent.getType(), gameStateEvent.serialize());
    } else {
      this.delayedIo.emit(event.getType(), event.serialize());
    }
  }

  private handlePing(socket: Socket, timestamp: number): void {
    // Send pong event back to client
    const delayedSocket = this.wrapSocket(socket);
    delayedSocket.emit(ServerSentEvents.PONG, new PongEvent(timestamp).serialize());

    // Update player's ping
    const player = this.players.get(socket.id);
    if (player) {
      const latency = Date.now() - timestamp;
      player.setPing(latency);
    }
  }

  private async handleChat(socket: Socket, message: string): Promise<void> {
    const player = this.players.get(socket.id);
    if (!player) return;

    // Check if it's a command
    if (message.trim().startsWith("/")) {
      const result = await this.chatCommandRegistry.executeFromChat(message.trim(), {
        player,
        args: [],
        entityManager: this.getEntityManager(),
      });

      // If command returned a message, send it as a system message
      if (result) {
        const chatEvent = new ChatMessageEvent({
          playerId: "system",
          message: result,
        });
        const delayedSocket = this.wrapSocket(socket);
        delayedSocket.emit(ServerSentEvents.CHAT_MESSAGE, chatEvent.getData());
      }
      return;
    }

    // Regular chat message - filter bad words and replace with asterisks
    const filteredMessage = this.badWordsFilter.clean(message);
    const chatEvent = new ChatMessageEvent({
      playerId: player.getId(),
      message: filteredMessage,
    });

    this.delayedIo.emit(ServerSentEvents.CHAT_MESSAGE, chatEvent.getData());
  }
}
