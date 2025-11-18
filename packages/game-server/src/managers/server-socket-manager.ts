import { Player } from "@/entities/players/player";
import { ServerSentEvents, ClientSentEvents } from "@shared/events/events";
import { GameEvent } from "@shared/events/types";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import { GameServer } from "@/core/server";
import PoolManager from "@shared/util/pool-manager";
import { createServer } from "http";
import { CommandManager } from "@/managers/command-manager";
import { MapManager } from "@/world/map-manager";
import { Broadcaster, IEntityManager, IGameManagers } from "@/managers/types";
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
import { BufferManager } from "@/broadcasting/buffer-manager";
import { Broadcaster as BroadcastingBroadcaster } from "@/broadcasting/broadcaster";
import { PlayerJoinedEvent } from "../../../game-shared/src/events/server-sent/events/player-joined-event";
import { HandlerContext, onDisconnect, onConnection } from "@/events/handlers";
import { socketEventHandlers } from "@/events/handlers/registry";
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
  private broadcaster: BroadcastingBroadcaster;

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

    // Initialize broadcaster (will be fully initialized after entityManager is set)
    this.broadcaster = new BroadcastingBroadcaster({
      io: this.io,
      delayedIo: this.delayedIo,
      entityManager: null as any, // Will be set when entityManager is set
      gameServer: this.gameServer,
      bufferManager: this.bufferManager,
      tickPerformanceTracker: this.tickPerformanceTracker,
    });

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
      sendEventToSocket: (socket: ISocketAdapter, event: GameEvent<any>) =>
        this.sendEventToSocket(socket, event),
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
    // Update broadcaster with tick performance tracker
    if (this.entityManager) {
      this.broadcaster = new BroadcastingBroadcaster({
        io: this.io,
        delayedIo: this.delayedIo,
        entityManager: this.entityManager,
        gameServer: this.gameServer,
        bufferManager: this.bufferManager,
        tickPerformanceTracker: tracker,
      });
    }
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
    // Update broadcaster with entity manager
    this.broadcaster = new BroadcastingBroadcaster({
      io: this.io,
      delayedIo: this.delayedIo,
      entityManager: entityManager,
      gameServer: this.gameServer,
      bufferManager: this.bufferManager,
      tickPerformanceTracker: this.tickPerformanceTracker,
    });
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
    const mapData = this.getMapManager().getMapData();
    this.broadcaster.sendInitialDataToSocket(socket, player.getId(), mapData, (sock) =>
      this.wrapSocket(sock)
    );
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

    // Automatically register all handlers from the registry
    for (const handlerRegistration of socketEventHandlers) {
      const eventName =
        handlerRegistration.event === "disconnect"
          ? "disconnect"
          : ClientSentEvents[handlerRegistration.event as keyof typeof ClientSentEvents];

      socket.on(eventName, (payload: any) => {
        handlerRegistration.handler(context, socket, payload);
      });
    }
  }

  private onConnection(socket: ISocketAdapter): void {
    const context = this.getHandlerContext();
    // Set up socket event listeners first
    this.setupSocketListeners(socket);
    // Then handle the connection
    onConnection(context, socket);
  }

  public broadcastEvent(event: GameEvent<any>): void {
    this.broadcaster.broadcastEvent(event);
  }

  /**
   * Send an event to a single socket (handles serialization automatically)
   */
  public sendEventToSocket(socket: ISocketAdapter, event: GameEvent<any>): void {
    const delayedSocket = this.wrapSocket(socket);
    const serializedData = event.serialize();
    const binaryBuffer = serializeServerEvent(event.getType(), [serializedData]);
    if (binaryBuffer !== null) {
      delayedSocket.emit(event.getType(), binaryBuffer);
    } else {
      delayedSocket.emit(event.getType(), serializedData);
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
