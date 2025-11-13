import { Player } from "@/entities/player";
import { ServerSentEvents, ClientSentEvents } from "@shared/events/events";
import { GameEvent } from "@shared/events/types";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import { GameServer } from "@/server";
import { AdminCommand } from "@shared/commands/commands";
import { Input } from "../../../game-shared/src/util/input";
import { RecipeType } from "../../../game-shared/src/util/recipes";
import { ItemType, isResourceItem, ResourceType } from "@shared/util/inventory";
import { itemRegistry } from "@shared/entities/item-registry";
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
import { getConfig } from "@shared/config";
import { DelayedServer, DelayedServerSocket } from "@/util/delayed-socket";
import { createCommandRegistry, CommandRegistry } from "@/commands";
import {
  RegExpMatcher,
  TextCensor,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

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
  private profanityMatcher: RegExpMatcher;
  private profanityCensor: TextCensor;

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

    // Wrap the io server with DelayedServer to handle latency simulation and byte tracking
    this.delayedIo = new DelayedServer(this.io, getConfig().network.SIMULATED_LATENCY_MS);

    this.gameServer = gameServer;

    // Initialize chat command registry
    this.chatCommandRegistry = createCommandRegistry();

    // Initialize profanity filter
    this.profanityMatcher = new RegExpMatcher({
      ...englishDataset.build(),
      ...englishRecommendedTransformers,
    });
    this.profanityCensor = new TextCensor();

    this.io.on("connection", (socket: Socket) => {
      const { displayName } = socket.handshake.query;

      // Filter bad words and replace with asterisks
      const filteredDisplayName = displayName
        ? this.sanitizeText(displayName as string)
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
    return new DelayedServerSocket(socket, getConfig().network.SIMULATED_LATENCY_MS);
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
      // DelayedSocket will automatically encode the payload and track bytes
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

    const itemType = selectedItem.itemType as ItemType;

    // Check if this is a resource item (wood, cloth)
    if (isResourceItem(itemType)) {
      // Add directly to player's resource count (this will broadcast the pickup event)
      player.addResource(itemType as ResourceType, 1);
      console.log(`Player ${player.getId()} bought ${itemType} for ${selectedItem.price} coins`);
    } else {
      // Handle regular inventory items
      const item = { itemType };
      const inventory = player.getExt(Inventory);

      // Add to inventory or drop on ground
      if (inventory.isFull()) {
        // Drop item 32 pixels down from player
        const playerPos = player.getExt(Positionable).getPosition();
        const dropPosition = new Vector2(playerPos.x, playerPos.y + 32);
        const droppedEntity = this.getEntityManager().createEntityFromItem(item);
        droppedEntity.getExt(Positionable).setPosition(dropPosition);
        console.log(`Dropped ${itemType} on ground for player ${player.getId()}`);
      } else {
        inventory.addItem(item);
        console.log(`Player ${player.getId()} bought ${itemType} for ${selectedItem.price} coins`);
      }
    }
  }

  private onPlaceStructure(
    socket: Socket,
    data: { itemType: ItemType; position: { x: number; y: number } }
  ): void {
    const player = this.players.get(socket.id);
    if (!player) return;

    const itemConfig = itemRegistry.get(data.itemType);
    if (!itemConfig?.placeable) {
      return;
    }

    // Validate placement distance
    const playerPos = player.getExt(Positionable).getCenterPosition();
    const placePos = new Vector2(data.position.x, data.position.y);
    const distance = playerPos.distance(placePos);
    const { MAX_PLACEMENT_RANGE, TILE_SIZE } = getConfig().world;

    if (distance > MAX_PLACEMENT_RANGE) {
      console.log(
        `Player ${player.getId()} tried to place ${data.itemType} too far away (${distance}px)`
      );
      return;
    }

    // Check if player has the item in inventory
    const inventory = player.getExt(Inventory);
    const inventoryItems = inventory.getItems();
    const itemIndex = inventoryItems.findIndex((item) => item?.itemType === data.itemType);

    if (itemIndex === -1) {
      console.log(`Player ${player.getId()} tried to place ${data.itemType} without having one`);
      return;
    }

    // Validate grid position is clear
    const gridX = Math.floor(data.position.x / TILE_SIZE);
    const gridY = Math.floor(data.position.y / TILE_SIZE);
    const mapData = this.getMapManager().getMapData();

    if (
      gridY < 0 ||
      gridY >= mapData.collidables.length ||
      gridX < 0 ||
      gridX >= mapData.collidables[0].length
    ) {
      console.log(`Player ${player.getId()} tried to place ${data.itemType} out of bounds`);
      return;
    }

    if (mapData.collidables[gridY][gridX] !== -1) {
      console.log(`Player ${player.getId()} tried to place ${data.itemType} on occupied tile`);
      return;
    }

    // Check if any entities are at this position
    const entities = this.getEntityManager().getEntities();
    const structureSize = TILE_SIZE;

    for (const entity of entities) {
      if (!entity.hasExt(Positionable)) continue;

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const dx = Math.abs(entityPos.x - (placePos.x + structureSize / 2));
      const dy = Math.abs(entityPos.y - (placePos.y + structureSize / 2));

      if (dx < structureSize && dy < structureSize) {
        console.log(`Player ${player.getId()} tried to place ${data.itemType} on existing entity`);
        return;
      }
    }

    // Remove item from inventory
    const item = inventoryItems[itemIndex];
    if (item?.state?.count && item.state.count > 1) {
      // Decrease count if there are multiple
      inventory.updateItemState(itemIndex, {
        ...item.state,
        count: item.state.count - 1,
      });
    } else {
      // Remove the item completely
      inventory.removeItem(itemIndex);
    }

    // Create entity at position
    // Only set health for items that have Destructible extension (wall, sentry gun, gasoline)
    let state = {};
    if (
      data.itemType === "wall" ||
      data.itemType === "sentry_gun" ||
      data.itemType === "gasoline"
    ) {
      let maxHealth = 1;
      if (data.itemType === "wall") {
        maxHealth = getConfig().world.WALL_MAX_HEALTH;
      } else if (data.itemType === "sentry_gun") {
        maxHealth = getConfig().world.SENTRY_GUN_MAX_HEALTH;
      } else if (data.itemType === "gasoline") {
        maxHealth = 1; // Gasoline has 1 health
      }
      state = { health: maxHealth };
    }

    const placedEntity = this.getEntityManager().createEntityFromItem({
      itemType: data.itemType,
      state,
    });

    placedEntity.getExt(Positionable).setPosition(placePos);
    this.getEntityManager().addEntity(placedEntity);

    console.log(
      `Player ${player.getId()} placed ${data.itemType} at (${placePos.x}, ${placePos.y})`
    );
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
    const currentTime = Date.now();

    // Clear dirty flags for all entities after sending full state
    // so they're not treated as "new" in subsequent updates
    entities.forEach((entity) => {
      entity.clearDirtyFlags();
    });

    const delayedSocket = this.wrapSocket(socket);
    const fullState = {
      entities: entities.map((entity) => entity.serialize()),
      timestamp: currentTime,
      isFullState: true,
      dayNumber: this.gameServer.getDayNumber(),
      cycleStartTime: this.gameServer.getCycleStartTime(),
      cycleDuration: this.gameServer.getCycleDuration(),
      isDay: this.gameServer.getIsDay(),
    };
    // DelayedSocket will automatically encode the payload and track bytes
    delayedSocket.emit(ServerSentEvents.GAME_STATE_UPDATE, fullState);
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
    socket.on(ClientSentEvents.PING_UPDATE, (latency: number) => {
      this.handlePingUpdate(socket, latency);
    });
    socket.on(ClientSentEvents.SEND_CHAT, (data: { message: string }) => {
      this.handleChat(socket, data.message);
    });
    socket.on(
      ClientSentEvents.PLACE_STRUCTURE,
      (data: { itemType: ItemType; position: { x: number; y: number } }) =>
        this.onPlaceStructure(socket, data)
    );
    socket.on(ClientSentEvents.PLAYER_RESPAWN_REQUEST, () => {
      this.onPlayerRespawnRequest(socket);
    });
    socket.on(ClientSentEvents.TELEPORT_TO_BASE, () => {
      this.onTeleportToBase(socket);
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
    const filteredDisplayName = this.sanitizeText(displayName);
    player.setDisplayName(filteredDisplayName);
  }

  private onPlayerRespawnRequest(socket: Socket): void {
    const player = this.players.get(socket.id);
    if (!player) return;
    if (!player.isDead()) return;

    player.respawn();
  }

  private onTeleportToBase(socket: Socket): void {
    const player = this.players.get(socket.id);
    if (!player) return;
    if (player.isDead()) return;

    // Get campsite position from map manager
    const campsitePosition = this.getMapManager().getRandomCampsitePosition();
    if (campsitePosition) {
      player.setPosition(campsitePosition);
    }
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
    // DelayedSocket will automatically encode the payload and track bytes
    const mapData = this.getMapManager().getMapData();
    const delayedSocket = this.wrapSocket(socket);
    delayedSocket.emit(ServerSentEvents.MAP, mapData);
  }

  public broadcastEvent(event: GameEvent<any>): void {
    if (event.getType() === ServerSentEvents.GAME_STATE_UPDATE) {
      const entities = this.getEntityManager().getEntities();
      const entityStateTracker = this.getEntityManager().getEntityStateTracker();
      const changedEntities = entityStateTracker.getChangedEntities(entities);
      const removedEntityIds = entityStateTracker.getRemovedEntityIds();

      // Extract game state properties from the passed event
      const eventData = (event as any).serialize ? (event as any).serialize() : {};

      // Only skip if no entity changes AND no game state changes AND no removed entities
      const hasGameStateChanges = Object.keys(eventData).some(
        (key) => key !== "entities" && key !== "timestamp" && eventData[key] !== undefined
      );

      if (changedEntities.length === 0 && removedEntityIds.length === 0 && !hasGameStateChanges) {
        return; // No changes to broadcast
      }

      // For each changed entity, serialize based on dirty state
      // New entities will have all extensions dirty, so serialize(false) will include everything
      // Changed entities will have only dirty extensions, so serialize(true) will include only changes
      const changedEntityData = changedEntities.map((entity) => {
        // Check if entity has all extensions dirty (likely a new entity)
        // If all extensions are dirty, send full state; otherwise send dirty-only
        // const allExtensionsDirty = entity
        //   .getExtensions()
        //   .every((ext) => ext.isDirty && ext.isDirty());

        // if (allExtensionsDirty) {
        // New entity - send full state
        //   return entity.serialize();
        // }

        // Changed entity - use dirty-only serialization
        // The entity's serialize(true) method returns all dirty fields
        return entity.serialize(true);
      });

      // Get current game state
      const currentGameState = {
        dayNumber: this.gameServer.getDayNumber(),
        cycleStartTime: this.gameServer.getCycleStartTime(),
        cycleDuration: this.gameServer.getCycleDuration(),
        isDay: this.gameServer.getIsDay(),
        // Wave system
        waveNumber: this.gameServer.getWaveNumber(),
        waveState: this.gameServer.getWaveState(),
        phaseStartTime: this.gameServer.getPhaseStartTime(),
        phaseDuration: this.gameServer.getPhaseDuration(),
        totalZombies: this.gameServer.getTotalZombies(),
      };

      // Get only changed game state properties
      const changedGameState = entityStateTracker.getChangedGameStateProperties(currentGameState);

      // Merge game state properties from passed event with changed game state
      const mergedGameState = {
        ...changedGameState,
        ...Object.fromEntries(
          Object.entries(eventData).filter(([key]) => key !== "entities" && key !== "timestamp")
        ),
      };

      const gameStateEvent = new GameStateEvent({
        entities: changedEntityData,
        removedEntityIds,
        isFullState: false,
        timestamp: Date.now(),
        ...mergedGameState,
      });

      // Clear dirty flags after broadcasting
      let i: number;
      for (i = 0; i < changedEntities.length; i++) {
        changedEntities[i].clearDirtyFlags();
      }
      entityStateTracker.trackGameState(currentGameState);
      // Clear removed entity IDs after they've been sent
      entityStateTracker.clearRemovedEntityIds();

      // DelayedServer will automatically encode the payload and track bytes
      this.delayedIo.emit(gameStateEvent.getType(), gameStateEvent.serialize());
    } else {
      // DelayedServer will automatically encode the payload and track bytes
      this.delayedIo.emit(event.getType(), event.serialize());
    }
  }

  private handlePing(socket: Socket, timestamp: number): void {
    // Send pong event back to client
    // timestamp is a Unix timestamp in milliseconds (UTC, timezone-independent)
    const delayedSocket = this.wrapSocket(socket);
    const serializedPong = new PongEvent(timestamp).serialize();
    // DelayedSocket will automatically encode the payload and track bytes
    delayedSocket.emit(ServerSentEvents.PONG, serializedPong);
    // Note: We no longer calculate latency here because it can be negative due to clock skew.
    // Instead, the client calculates round-trip latency and sends it via PING_UPDATE event.
  }

  private handlePingUpdate(socket: Socket, latency: number): void {
    // Update player's ping with the latency calculated by the client
    // This ensures accurate ping calculation without clock skew issues
    const player = this.players.get(socket.id);
    if (player) {
      // Ensure latency is non-negative (sanity check)
      player.setPing(Math.max(0, latency));
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
    const filteredMessage = this.sanitizeText(message);
    const chatEvent = new ChatMessageEvent({
      playerId: player.getId(),
      message: filteredMessage,
    });

    const chatEventData = chatEvent.getData();
    // DelayedServer will automatically encode the payload and track bytes
    this.delayedIo.emit(ServerSentEvents.CHAT_MESSAGE, chatEventData);
  }

  /**
   * Sanitize text by replacing profane words with asterisks
   */
  private sanitizeText(text: string): string {
    const matches = this.profanityMatcher.getAllMatches(text);
    return this.profanityCensor.applyTo(text, matches);
  }
}
