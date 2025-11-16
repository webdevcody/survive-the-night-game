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
import PoolManager from "@shared/util/pool-manager";
import { createServer } from "http";
import express from "express";
import biomeRoutes from "../api/biome-routes.js";
import { CommandManager } from "@/managers/command-manager";
import { MapManager } from "@/managers/map-manager";
import { Broadcaster, IEntityManager, IGameManagers } from "@/managers/types";
import { IEntity } from "@/entities/types";
import { GameStateEvent } from "@shared/events/server-sent/game-state-event";
import { PlayerJoinedEvent } from "@shared/events/server-sent/player-joined-event";
import { PongEvent } from "@shared/events/server-sent/pong-event";
import { ChatMessageEvent } from "@shared/events/server-sent/chat-message-event";
import { PlayerLeftEvent } from "@/events/server-sent/player-left-event";
import { BuildEvent } from "@shared/events/server-sent/build-event";
import { getConfig } from "@shared/config";
import { DelayedServer, DelayedServerSocket } from "@/util/delayed-socket";
import { createCommandRegistry, CommandRegistry } from "@/commands";
import {
  RegExpMatcher,
  TextCensor,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";
import { TickPerformanceTracker } from "@/util/tick-performance-tracker";
import { IServerAdapter } from "@shared/network/server-adapter";
import { ISocketAdapter } from "@shared/network/socket-adapter";
import { createServerAdapter } from "@/network/adapter-factory";
import { BufferManager } from "./buffer-manager";
import { serializeServerEvent } from "@shared/events/server-sent/server-event-serialization";

/**
 * Any and all functionality related to sending server side events
 * or listening for client side events should live here.
 */
export class ServerSocketManager implements Broadcaster {
  private io: IServerAdapter;
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
  private tickPerformanceTracker: TickPerformanceTracker | null = null;
  private bufferManager: BufferManager;

  constructor(port: number, gameServer: GameServer) {
    this.port = port;
    this.bufferManager = new BufferManager();

    const implementation = getConfig().network.WEBSOCKET_IMPLEMENTATION;

    // For Socket.IO, we need Express for HTTP API routes (biome editor)
    // For uWebSockets, we can handle HTTP directly or skip it entirely
    if (implementation === "socketio") {
      // Set up Express app for Socket.IO
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
    } else {
      // For uWebSockets, we don't need Express - create a minimal HTTP server
      // or pass null if the adapter doesn't need it
      this.httpServer = createServer((req, res) => {
        // Minimal HTTP handler - uWebSockets will handle everything
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      });
    }

    // Create server adapter based on configuration
    this.io = createServerAdapter(this.httpServer, {
      origin: "*",
      methods: ["GET", "POST"],
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

    this.io.on("connection", (socket: ISocketAdapter) => {
      const { displayName } = socket.handshake.query;

      // Filter bad words and replace with asterisks
      const filteredDisplayName = displayName
        ? this.sanitizeText(Array.isArray(displayName) ? displayName[0] : displayName)
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
  private wrapSocket(socket: ISocketAdapter): DelayedServerSocket {
    return new DelayedServerSocket(socket, getConfig().network.SIMULATED_LATENCY_MS);
  }

  public setGameManagers(gameManagers: IGameManagers): void {
    this.gameManagers = gameManagers;
  }

  setTickPerformanceTracker(tracker: TickPerformanceTracker) {
    this.tickPerformanceTracker = tracker;
  }

  getCurrentBandwidth(): number {
    return this.delayedIo.getCurrentBandwidth();
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

  private createPlayerForSocket(socket: ISocketAdapter): Player {
    const player = new Player(this.getGameManagers());
    player.setDisplayName(this.playerDisplayNames.get(socket.id) ?? "Unknown");

    const spawnPosition = this.getMapManager().getRandomGrassPosition();
    if (spawnPosition) {
      player.getExt(Positionable).setPosition(spawnPosition);
    } else {
      console.warn(
        `No spawn position available for socket ${socket.id}, defaulting player to origin`
      );
      const poolManager = PoolManager.getInstance();
      player.getExt(Positionable).setPosition(poolManager.vector2.claim(0, 0));
    }

    this.players.set(socket.id, player);
    this.getEntityManager().addEntity(player);

    return player;
  }

  private sendInitialDataToSocket(socket: ISocketAdapter, player: Player): void {
    const delayedSocket = this.wrapSocket(socket);
    const mapData = this.getMapManager().getMapData();
    delayedSocket.emit(ServerSentEvents.MAP, mapData);

    const yourIdBuffer = serializeServerEvent(ServerSentEvents.YOUR_ID, [player.getId()]);
    if (yourIdBuffer !== null) {
      delayedSocket.emit(ServerSentEvents.YOUR_ID, yourIdBuffer);
    } else {
      delayedSocket.emit(ServerSentEvents.YOUR_ID, player.getId());
    }
  }

  private broadcastPlayerJoined(player: Player): void {
    this.broadcastEvent(
      new PlayerJoinedEvent({ playerId: player.getId(), displayName: player.getDisplayName() })
    );
  }

  public recreatePlayersForConnectedSockets(): void {
    // Clear existing player map
    this.players.clear();

    // Get all connected sockets
    const sockets = Array.from(this.io.sockets.sockets.values());

    // Create new players for each connected socket
    sockets.forEach((socket) => {
      const player = this.createPlayerForSocket(socket);
      this.sendInitialDataToSocket(socket, player);
      this.broadcastPlayerJoined(player);
    });
  }

  public listen(): void {
    const implementation = getConfig().network.WEBSOCKET_IMPLEMENTATION;

    if (implementation === "uwebsockets") {
      // uWebSockets listens directly on the port - no HTTP server needed
      this.io.listen(this.port, () => {
        console.log(`Server listening on port ${this.port} (uWebSockets)`);
      });
    } else {
      // Socket.IO: Listen using the HTTP server directly (which has Express attached)
      this.httpServer.listen(this.port, () => {
        console.log(`Server listening on port ${this.port} (Socket.IO)`);
      });
    }
  }

  private onDisconnect(socket: ISocketAdapter): void {
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

  private onCraftRequest(socket: ISocketAdapter, recipe: RecipeType): void {
    const player = this.players.get(socket.id);

    if (player) {
      player.craftRecipe(recipe);
    }
  }

  private onMerchantBuy(
    socket: ISocketAdapter,
    data: { merchantId: number; itemIndex: number }
  ): void {
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
        const poolManager = PoolManager.getInstance();
        const dropPosition = poolManager.vector2.claim(playerPos.x, playerPos.y + 32);
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
    socket: ISocketAdapter,
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
    const poolManager = PoolManager.getInstance();
    const placePos = poolManager.vector2.claim(data.position.x, data.position.y);
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

    const placedEntity = this.getEntityManager().createEntityFromItem({
      itemType: data.itemType,
      state: {},
    });

    placedEntity.getExt(Positionable).setPosition(placePos);
    this.getEntityManager().addEntity(placedEntity);

    console.log(
      `Player ${player.getId()} placed ${data.itemType} at (${placePos.x}, ${placePos.y})`
    );

    // Broadcast build event if item has a placeSound configured
    if (itemConfig.placeSound) {
      this.broadcastEvent(
        new BuildEvent({
          playerId: player.getId(),
          position: { x: placePos.x, y: placePos.y },
          soundType: itemConfig.placeSound,
        })
      );
    }
  }

  private onPlayerInput(socket: ISocketAdapter, input: Input): void {
    const player = this.players.get(socket.id);
    if (!player) return;
    player.setInput(input);
  }

  private setPlayerCrafting(socket: ISocketAdapter, isCrafting: boolean): void {
    const player = this.players.get(socket.id);
    if (!player) return;
    player.setIsCrafting(isCrafting);
  }

  private sendFullState(socket: ISocketAdapter): void {
    const entities = this.getEntityManager().getEntities();
    const currentTime = Date.now();

    // Cache game state data needed for metadata serialization
    const dayNumber = this.gameServer.getDayNumber();
    const cycleStartTime = this.gameServer.getCycleStartTime();
    const cycleDuration = this.gameServer.getCycleDuration();
    const isDay = this.gameServer.getIsDay();
    const waveNumber = this.gameServer.getWaveNumber();
    const waveState = this.gameServer.getWaveState();
    const phaseStartTime = this.gameServer.getPhaseStartTime();
    const phaseDuration = this.gameServer.getPhaseDuration();
    const totalZombies = this.gameServer.getTotalZombies();

    // Clear dirty flags for all entities after sending full state
    // so they're not treated as "new" in subsequent updates
    entities.forEach((entity) => {
      entity.clearDirtyFlags();
    });

    const delayedSocket = this.wrapSocket(socket);

    // Serialize full state to buffer
    this.bufferManager.clear();
    this.bufferManager.writeEntityCount(entities.length);
    for (const entity of entities) {
      this.bufferManager.writeEntity(entity, false);
    }
    this.bufferManager.writeGameState({
      timestamp: currentTime,
      isFullState: true,
      dayNumber,
      cycleStartTime,
      cycleDuration,
      isDay,
      waveNumber,
      waveState,
      phaseStartTime,
      phaseDuration,
      totalZombies,
    });
    this.bufferManager.writeRemovedEntityIds([]);

    const buffer = this.bufferManager.getBuffer();
    delayedSocket.emit(ServerSentEvents.GAME_STATE_UPDATE, buffer);
  }

  private setupSocketListeners(socket: ISocketAdapter): void {
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
    socket.on(ClientSentEvents.MERCHANT_BUY, (data: { merchantId: number; itemIndex: number }) =>
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

  private setPlayerDisplayName(socket: ISocketAdapter, displayName: string): void {
    const player = this.players.get(socket.id);
    if (!player) return;
    if (displayName.length > 12) {
      displayName = displayName.substring(0, 12);
    }
    // Filter bad words and replace with asterisks
    const filteredDisplayName = this.sanitizeText(displayName);
    player.setDisplayName(filteredDisplayName);
  }

  private onPlayerRespawnRequest(socket: ISocketAdapter): void {
    const player = this.players.get(socket.id);
    if (!player) return;
    if (!player.isDead()) return;

    player.respawn();
  }

  private onTeleportToBase(socket: ISocketAdapter): void {
    const player = this.players.get(socket.id);
    if (!player) return;
    if (player.isDead()) return;

    // Get campsite position from map manager
    const campsitePosition = this.getMapManager().getRandomCampsitePosition();
    if (campsitePosition) {
      player.setPosition(campsitePosition);
    }
  }

  private onConnection(socket: ISocketAdapter): void {
    console.log(`Player connected: ${socket.id} - ${this.playerDisplayNames.get(socket.id)}`);

    // Set up socket event listeners first
    this.setupSocketListeners(socket);

    // Check if there's already a player for this socket ID (can happen on quick reconnect)
    const existingPlayer = this.players.get(socket.id);
    if (existingPlayer) {
      console.log(`Cleaning up existing player for socket ${socket.id} before creating new one`);
      // Remove the existing player entity to prevent duplicates
      this.getEntityManager().removeEntity(existingPlayer.getId());
      this.players.delete(socket.id);
    }

    const totalPlayers = this.getEntityManager()
      .getPlayerEntities()
      .filter((entity) => !(entity as Player).isMarkedForRemoval()).length;

    if (totalPlayers === 0) {
      console.log("Starting new game");
      this.gameServer.startNewGame();
      let player = this.players.get(socket.id);
      let shouldBroadcastJoin = false;

      if (!player) {
        player = this.createPlayerForSocket(socket);
        shouldBroadcastJoin = true;
      }

      this.sendInitialDataToSocket(socket, player);

      if (shouldBroadcastJoin) {
        this.broadcastPlayerJoined(player);
      }

      return;
    }

    const player = this.createPlayerForSocket(socket);
    this.sendInitialDataToSocket(socket, player);
    this.broadcastPlayerJoined(player);
  }

  public broadcastEvent(event: GameEvent<any>): void {
    // Early return optimization: if no clients connected, skip broadcasting
    const connectedClients = this.io.sockets.sockets.size;
    if (connectedClients === 0) {
      return;
    }

    if (event.getType() === ServerSentEvents.GAME_STATE_UPDATE) {
      // Track entity state tracking operations
      const endEntityStateTracking =
        this.tickPerformanceTracker?.startMethod("entityStateTracking", "broadcastGameState") ||
        (() => {});
      const entityStateTracker = this.getEntityManager().getEntityStateTracker();

      // Early return optimization: check cheapest checks first
      const removedEntityIds = entityStateTracker.getRemovedEntityIds();
      const removedCount = removedEntityIds.length;

      // Extract game state properties from the passed event (optimized)
      const eventSerialize = (event as any).serialize;
      const eventData = eventSerialize ? eventSerialize.call(event) : {};

      // Optimize hasGameStateChanges check: iterate directly instead of Object.keys().some()
      let hasGameStateChanges = false;
      for (const key in eventData) {
        if (key !== "entities" && key !== "timestamp" && eventData[key] !== undefined) {
          hasGameStateChanges = true;
          break;
        }
      }

      // Early return optimization: only get entities if we might have changes
      // If we have removed entities or game state changes, we definitely need to process
      // Otherwise, check changed entities to see if we can early return
      let entities: IEntity[];
      let changedEntities: IEntity[];
      let changedCount: number;

      if (removedCount === 0 && !hasGameStateChanges) {
        // No removed entities and no game state changes - check if any entities changed
        changedEntities = entityStateTracker.getChangedEntities();
        changedCount = changedEntities.length;
        if (changedCount === 0) {
          endEntityStateTracking();
          return; // No changes to broadcast
        }
        entities = this.getEntityManager().getEntities();
      } else {
        // We have removed entities or game state changes - need to process
        entities = this.getEntityManager().getEntities();
        changedEntities = entityStateTracker.getChangedEntities();
        changedCount = changedEntities.length;
      }

      // Final early return check
      if (changedCount === 0 && removedCount === 0 && !hasGameStateChanges) {
        endEntityStateTracking();
        return; // No changes to broadcast
      }
      endEntityStateTracking();

      // Track game state preparation
      const endGameStatePrep =
        this.tickPerformanceTracker?.startMethod("gameStatePreparation", "broadcastGameState") ||
        (() => {});
      // Cache all gameServer getter results before creating currentGameState object
      const dayNumber = this.gameServer.getDayNumber();
      const cycleStartTime = this.gameServer.getCycleStartTime();
      const cycleDuration = this.gameServer.getCycleDuration();
      const isDay = this.gameServer.getIsDay();
      const waveNumber = this.gameServer.getWaveNumber();
      const waveState = this.gameServer.getWaveState();
      const phaseStartTime = this.gameServer.getPhaseStartTime();
      const phaseDuration = this.gameServer.getPhaseDuration();
      const totalZombies = this.gameServer.getTotalZombies();
      endGameStatePrep();

      // Clear buffer manager for new game loop
      this.bufferManager.clear();

      // Track entity serialization
      const endEntitySerialization =
        this.tickPerformanceTracker?.startMethod("entitySerialization", "broadcastGameState") ||
        (() => {});
      // Write entity count
      this.bufferManager.writeEntityCount(changedCount);
      // For each changed entity, serialize to buffer based on dirty state
      // Changed entities will have only dirty extensions, so serialize(true) will include only changes
      for (const entity of changedEntities) {
        this.bufferManager.writeEntity(entity, true);
      }
      endEntitySerialization();

      // Track game state merging
      const endGameStateMerging =
        this.tickPerformanceTracker?.startMethod("gameStateMerging", "broadcastGameState") ||
        (() => {});
      // Get current game state (using cached values)
      const currentGameState = {
        dayNumber,
        cycleStartTime,
        cycleDuration,
        isDay,
        // Wave system
        waveNumber,
        waveState,
        phaseStartTime,
        phaseDuration,
        totalZombies,
      };

      // Get only changed game state properties
      const changedGameState = entityStateTracker.getChangedGameStateProperties(currentGameState);

      // Optimize mergedGameState construction: build object directly instead of Object.fromEntries/Object.entries
      const mergedGameState: Record<string, any> = { ...changedGameState };
      for (const key in eventData) {
        if (key !== "entities" && key !== "timestamp") {
          mergedGameState[key] = eventData[key];
        }
      }

      // Reuse timestamp from eventData if available, otherwise use Date.now()
      const timestamp = eventData.timestamp !== undefined ? eventData.timestamp : Date.now();

      // Write game state metadata to buffer
      this.bufferManager.writeGameState({
        ...mergedGameState,
        timestamp,
        isFullState: false,
      });

      // Write removed entity IDs
      this.bufferManager.writeRemovedEntityIds(removedEntityIds);
      endGameStateMerging();

      // Track cleanup operations
      const endCleanup =
        this.tickPerformanceTracker?.startMethod("broadcastCleanup", "broadcastGameState") ||
        (() => {});

      // Log dirty entity information for diagnostics (if performance monitoring enabled)
      if (this.tickPerformanceTracker && changedCount > 0) {
        const dirtyEntityInfo = entityStateTracker.getDirtyEntityInfo();
        if (dirtyEntityInfo.length > 0) {
          this.tickPerformanceTracker.recordDirtyEntities(
            dirtyEntityInfo.map((info) => ({
              id: String(info.id),
              type: info.type,
              reason: info.reason,
            })),
            changedCount,
            entities.length
          );
        }
      }

      // Clear dirty flags after broadcasting (optimized loop)
      for (const entity of changedEntities) {
        entity.clearDirtyFlags();
      }
      entityStateTracker.trackGameState(currentGameState);
      // Clear removed entity IDs after they've been sent
      entityStateTracker.clearRemovedEntityIds();
      // Clear dirty entity info after logging
      entityStateTracker.clearDirtyEntityInfo();
      endCleanup();

      // Track websocket emit
      const endWebSocketEmit =
        this.tickPerformanceTracker?.startMethod("webSocketEmit", "broadcastGameState") ||
        (() => {});
      // Send buffer directly instead of serializing to objects
      const buffer = this.bufferManager.getBuffer();
      this.delayedIo.emit(event.getType(), buffer);
      endWebSocketEmit();
    } else {
      // Try to serialize as binary, fall back to JSON if not supported
      const serializedData = event.serialize();
      const binaryBuffer = serializeServerEvent(event.getType(), [serializedData]);
      if (binaryBuffer !== null) {
        // Send as binary
        this.delayedIo.emit(event.getType(), binaryBuffer);
      } else {
        // Fall back to JSON
        this.delayedIo.emit(event.getType(), serializedData);
      }
    }
  }

  private handlePing(socket: ISocketAdapter, timestamp: number): void {
    // Send pong event back to client
    // timestamp is a Unix timestamp in milliseconds (UTC, timezone-independent)
    const delayedSocket = this.wrapSocket(socket);

    // Try to serialize as binary, fall back to JSON if not supported
    const binaryBuffer = serializeServerEvent(ServerSentEvents.PONG, [{ timestamp }]);
    if (binaryBuffer !== null) {
      // Send as binary
      delayedSocket.emit(ServerSentEvents.PONG, binaryBuffer);
    } else {
      // Fall back to JSON
      const pongEvent = new PongEvent(timestamp);
      delayedSocket.emit(ServerSentEvents.PONG, pongEvent.serialize());
    }
    // Note: We no longer calculate latency here because it can be negative due to clock skew.
    // Instead, the client calculates round-trip latency and sends it via PING_UPDATE event.
  }

  private handlePingUpdate(socket: ISocketAdapter, latency: number): void {
    // Update player's ping with the latency calculated by the client
    // This ensures accurate ping calculation without clock skew issues
    const player = this.players.get(socket.id);
    if (player) {
      // Ensure latency is non-negative (sanity check)
      player.setPing(Math.max(0, latency));
    }
  }

  private async handleChat(socket: ISocketAdapter, message: string): Promise<void> {
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
          playerId: 0, // System message uses ID 0
          message: result,
        });
        const delayedSocket = this.wrapSocket(socket);
        const chatData = chatEvent.getData();
        const chatBuffer = serializeServerEvent(ServerSentEvents.CHAT_MESSAGE, [chatData]);
        if (chatBuffer !== null) {
          delayedSocket.emit(ServerSentEvents.CHAT_MESSAGE, chatBuffer);
        } else {
          delayedSocket.emit(ServerSentEvents.CHAT_MESSAGE, chatData);
        }
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
    // Try to serialize as binary
    const chatBuffer = serializeServerEvent(ServerSentEvents.CHAT_MESSAGE, [chatEventData]);
    if (chatBuffer !== null) {
      this.delayedIo.emit(ServerSentEvents.CHAT_MESSAGE, chatBuffer);
    } else {
      this.delayedIo.emit(ServerSentEvents.CHAT_MESSAGE, chatEventData);
    }
  }

  /**
   * Sanitize text by replacing profane words with asterisks
   */
  private sanitizeText(text: string): string {
    const matches = this.profanityMatcher.getAllMatches(text);
    return this.profanityCensor.applyTo(text, matches);
  }
}
