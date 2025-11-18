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
import PoolManager from "@shared/util/pool-manager";
import { createServer } from "http";
import { CommandManager } from "@/managers/command-manager";
import { MapManager } from "@/managers/map-manager";
import { Broadcaster, IEntityManager, IGameManagers } from "@/managers/types";
import { IEntity } from "@/entities/types";
import { PlayerJoinedEvent } from "@shared/events/server-sent/player-joined-event";
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
import {
  HandlerContext,
  onDisconnect,
  onCraftRequest,
  onMerchantBuy,
  onPlaceStructure,
  onPlayerInput,
  setPlayerCrafting,
  sendFullState,
  setPlayerDisplayName,
  onPlayerRespawnRequest,
  onTeleportToBase,
  onConnection,
  handlePing,
  handlePingUpdate,
  handleChat,
} from "./handlers";

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

    // Create HTTP server for websocket adapter
    // Note: Biome editor API is now in a separate service (biome-editor-server)
    if (implementation === "socketio") {
      // For Socket.IO, create a minimal HTTP server
      this.httpServer = createServer((req, res) => {
        // Minimal HTTP handler - websocket server doesn't handle HTTP routes
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      });
    } else {
      // For uWebSockets, create a minimal HTTP server
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

  /**
   * Get handler context for passing to handler functions
   */
  private getHandlerContext(): HandlerContext {
    return {
      players: this.players,
      playerDisplayNames: this.playerDisplayNames,
      gameServer: this.gameServer,
      bufferManager: this.bufferManager,
      delayedIo: this.delayedIo,
      chatCommandRegistry: this.chatCommandRegistry,
      profanityMatcher: this.profanityMatcher,
      profanityCensor: this.profanityCensor,
      getEntityManager: () => this.getEntityManager(),
      getMapManager: () => this.getMapManager(),
      getCommandManager: () => this.getCommandManager(),
      getGameManagers: () => this.getGameManagers(),
      wrapSocket: (socket: ISocketAdapter) => this.wrapSocket(socket),
      broadcastEvent: (event: GameEvent<any>) => this.broadcastEvent(event),
      sanitizeText: (text: string) => this.sanitizeText(text),
      createPlayerForSocket: (socket: ISocketAdapter) => this.createPlayerForSocket(socket),
      sendInitialDataToSocket: (socket: ISocketAdapter, player: Player) =>
        this.sendInitialDataToSocket(socket, player),
      broadcastPlayerJoined: (player: Player) => this.broadcastPlayerJoined(player),
    };
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

  private setupSocketListeners(socket: ISocketAdapter): void {
    const context = this.getHandlerContext();
    socket.on(ClientSentEvents.PLAYER_INPUT, (input: Input) =>
      onPlayerInput(context, socket, input)
    );
    socket.on(ClientSentEvents.CRAFT_REQUEST, (recipe: RecipeType) =>
      onCraftRequest(context, socket, recipe)
    );
    socket.on(ClientSentEvents.START_CRAFTING, (recipe: RecipeType) =>
      setPlayerCrafting(context, socket, true)
    );
    socket.on(ClientSentEvents.STOP_CRAFTING, (recipe: RecipeType) =>
      setPlayerCrafting(context, socket, false)
    );
    socket.on(ClientSentEvents.ADMIN_COMMAND, (command: AdminCommand) =>
      this.getCommandManager().handleCommand(command)
    );
    socket.on(ClientSentEvents.SET_DISPLAY_NAME, (displayName: string) =>
      setPlayerDisplayName(context, socket, displayName)
    );
    socket.on(ClientSentEvents.MERCHANT_BUY, (data: { merchantId: number; itemIndex: number }) =>
      onMerchantBuy(context, socket, data)
    );
    socket.on(ClientSentEvents.REQUEST_FULL_STATE, () => sendFullState(context, socket));
    socket.on(ClientSentEvents.PING, (timestamp: number) => {
      handlePing(context, socket, timestamp);
    });
    socket.on(ClientSentEvents.PING_UPDATE, (latency: number) => {
      handlePingUpdate(context, socket, latency);
    });
    socket.on(ClientSentEvents.SEND_CHAT, (data: { message: string }) => {
      handleChat(context, socket, data.message);
    });
    socket.on(
      ClientSentEvents.PLACE_STRUCTURE,
      (data: { itemType: ItemType; position: { x: number; y: number } }) =>
        onPlaceStructure(context, socket, data)
    );
    socket.on(ClientSentEvents.PLAYER_RESPAWN_REQUEST, () => {
      onPlayerRespawnRequest(context, socket);
    });
    socket.on(ClientSentEvents.TELEPORT_TO_BASE, () => {
      onTeleportToBase(context, socket);
    });
    socket.on("disconnect", () => {
      onDisconnect(context, socket);
    });
  }

  private onConnection(socket: ISocketAdapter): void {
    const context = this.getHandlerContext();
    // Set up socket event listeners first
    this.setupSocketListeners(socket);
    // Then handle the connection
    onConnection(context, socket);
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
      const waveNumber = this.gameServer.getWaveNumber();
      const waveState = this.gameServer.getWaveState();
      const phaseStartTime = this.gameServer.getPhaseStartTime();
      const phaseDuration = this.gameServer.getPhaseDuration();
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
        // Wave system
        waveNumber,
        waveState,
        phaseStartTime,
        phaseDuration,
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
      const hasRemovedEntities = removedCount > 0;
      this.bufferManager.writeGameState(
        {
          ...mergedGameState,
          timestamp,
          isFullState: false,
        },
        hasRemovedEntities
      );

      // Write removed entity IDs (only if there are any)
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
      // this.bufferManager.logStats();
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

  /**
   * Sanitize text by replacing profane words with asterisks
   */
  private sanitizeText(text: string): string {
    const matches = this.profanityMatcher.getAllMatches(text);
    return this.profanityCensor.applyTo(text, matches);
  }
}
