import { Player } from "@/entities/players/player";
import { ClientSentEvents } from "@shared/events/events";
import { GameEvent } from "@shared/events/types";
import { GameServer } from "@/core/server";
import { createServer } from "http";
import { MapManager } from "@/world/map-manager";
import { Broadcaster, IEntityManager, IGameManagers } from "@/managers/types";
import { getConfig } from "@shared/config";
import { createCommandRegistry, CommandRegistry } from "@/commands";
import { PlayerColor } from "@shared/commands/commands";
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
import { VersionMismatchEvent } from "../../../game-shared/src/events/server-sent/events/version-mismatch-event";
import { AuthRequiredEvent } from "../../../game-shared/src/events/server-sent/events/auth-required-event";
import { YourIdEvent } from "../../../game-shared/src/events/server-sent/events/your-id-event";
import type { GameModeId } from "@shared/events/server-sent/events/game-started-event";
import { HandlerContext, onConnection, sendFullState } from "@/events/handlers";
import { socketEventHandlers } from "@/events/handlers/registry";
import { serializeServerEvent } from "@shared/events/server-sent/server-event-serialization";
import { SessionValidator } from "@/services/session-validator";
import { UserSessionCache } from "@/services/user-session-cache";
import { KillTracker } from "@/services/kill-tracker";
import { WEBSITE_API_URL, GAME_SERVER_API_KEY } from "@/config/env";

/**
 * Any and all functionality related to sending server side events
 * or listening for client side events should live here.
 */
export class ServerSocketManager implements Broadcaster {
  private io: IServerAdapter;
  private players: Map<string, Player> = new Map();
  private playerDisplayNames: Map<string, string> = new Map();
  private playerColors: Map<string, PlayerColor> = new Map();
  private port: number;
  private httpServer: any;
  private entityManager?: IEntityManager;
  private mapManager?: MapManager;
  private gameServer: GameServer;
  private gameManagers?: IGameManagers;
  private chatCommandRegistry: CommandRegistry;
  private profanityMatcher: RegExpMatcher;
  private profanityCensor: TextCensor;
  private tickPerformanceTracker: TickPerformanceTracker | null = null;
  private bufferManager: BufferManager;
  private broadcaster: BroadcastingBroadcaster;
  private sessionValidator: SessionValidator;
  private userSessionCache: UserSessionCache;

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
      entityManager: null as any, // Will be set when entityManager is set
      gameServer: this.gameServer,
      bufferManager: this.bufferManager,
      tickPerformanceTracker: this.tickPerformanceTracker,
    });

    // Initialize session services
    this.sessionValidator = SessionValidator.getInstance();
    this.userSessionCache = UserSessionCache.getInstance();

    // Initialize kill tracker with access to players map
    KillTracker.getInstance().initialize(this.players);

    this.io.on("connection", (socket: ISocketAdapter) => {
      const { displayName, version, gameAuthToken } = socket.handshake.query;

      const rawDisplayName = displayName
        ? Array.isArray(displayName)
          ? displayName[0]
          : displayName
        : "Unknown";

      // Check version compatibility
      const clientVersion = Array.isArray(version) ? version[0] : version;
      const serverVersion = getConfig().meta.VERSION;

      if (!clientVersion || clientVersion !== serverVersion) {
        console.warn(
          `Version mismatch: client version ${clientVersion} does not match server version ${serverVersion}. Socket ${socket.id} will receive mismatch event.`,
        );
        // Send version mismatch event - client will handle redirect and disconnect
        const versionMismatchEvent = new VersionMismatchEvent({
          serverVersion,
          clientVersion: clientVersion || undefined,
        });
        this.sendEventToSocket(socket, versionMismatchEvent);
        // Don't call onConnection or set up the player - just keep socket alive for the event
        return;
      }

      const tokenStr = gameAuthToken
        ? Array.isArray(gameAuthToken)
          ? gameAuthToken[0]
          : gameAuthToken
        : undefined;

      const authResult = this.sessionValidator.validateGameAuthToken(tokenStr ?? "");
      if (!authResult.valid || !authResult.userId) {
        const authRequiredEvent = new AuthRequiredEvent({
          message: authResult.error ?? "Authentication required",
        });
        this.sendEventToSocket(socket, authRequiredEvent);
        socket.disconnect(true);
        return;
      }

      const userId = authResult.userId;

      // Filter bad words and replace with asterisks
      const filteredDisplayName = rawDisplayName ? this.sanitizeText(rawDisplayName) : undefined;

      // Allow multiple connections with the same display name
      // Each connection gets its own player entity
      this.playerDisplayNames.set(socket.id, filteredDisplayName || "Unknown");

      this.userSessionCache.setUserSession(socket.id, userId, tokenStr!);
      console.log(`Socket ${socket.id} authenticated as user ${userId}`);

      void (async () => {
        const initialExperience = await this.fetchPersistedExperience(userId);
        await this.onConnection(socket, initialExperience);
      })().catch((err) => {
        console.error(`[ServerSocketManager] onConnection failed for socket ${socket.id}:`, err);
      });
    });
  }

  /**
   * Load persisted experience from the website DB before the player entity is created
   * so the first game state snapshot includes the correct value.
   */
  private async fetchPersistedExperience(userId: string): Promise<number> {
    if (!GAME_SERVER_API_KEY) {
      return 0;
    }

    const url = `${WEBSITE_API_URL}/api/game/player-experience?userId=${encodeURIComponent(userId)}`;

    try {
      const response = await fetch(url, {
        headers: { "X-API-Key": GAME_SERVER_API_KEY },
      });
      if (!response.ok) {
        console.warn(
          `[ServerSocketManager] player-experience HTTP ${response.status} for user ${userId}`,
        );
        return 0;
      }
      const data = (await response.json()) as { experience?: number };
      if (typeof data.experience === "number" && data.experience >= 0) {
        return Math.floor(data.experience);
      }
    } catch (error) {
      console.warn(`[ServerSocketManager] fetchPersistedExperience failed for ${userId}:`, error);
    }
    return 0;
  }

  /**
   * Get handler context for passing to handler functions
   */
  private getHandlerContext(): HandlerContext {
    return {
      players: this.players,
      playerDisplayNames: this.playerDisplayNames,
      playerColors: this.playerColors,
      gameServer: this.gameServer,
      bufferManager: this.bufferManager,
      chatCommandRegistry: this.chatCommandRegistry,
      profanityMatcher: this.profanityMatcher,
      profanityCensor: this.profanityCensor,
      sessionValidator: this.sessionValidator,
      userSessionCache: this.userSessionCache,
      getEntityManager: () => this.getEntityManager(),
      getMapManager: () => this.getMapManager(),
      getGameManagers: () => this.getGameManagers(),
      broadcastEvent: (event: GameEvent<any>) => this.broadcastEvent(event),
      sendEventToSocket: (socket: ISocketAdapter, event: GameEvent<any>) =>
        this.sendEventToSocket(socket, event),
      sanitizeText: (text: string) => this.sanitizeText(text),
      createPlayerForSocket: (socket: ISocketAdapter, initialExperience?: number) =>
        this.createPlayerForSocket(socket, initialExperience),
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
        entityManager: this.entityManager,
        gameServer: this.gameServer,
        bufferManager: this.bufferManager,
        tickPerformanceTracker: tracker,
      });
    }
  }

  getCurrentBandwidth(): number {
    return this.broadcaster.getCurrentBandwidth();
  }

  public getGameManagers(): IGameManagers {
    if (!this.gameManagers) {
      throw new Error("Game managers not set");
    }
    return this.gameManagers;
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
      entityManager: entityManager,
      gameServer: this.gameServer,
      bufferManager: this.bufferManager,
      tickPerformanceTracker: this.tickPerformanceTracker,
    });
  }

  public setMapManager(mapManager: MapManager): void {
    this.mapManager = mapManager;
  }

  private createPlayerForSocket(socket: ISocketAdapter, initialExperience: number = 0): Player {
    const player = new Player(this.getGameManagers());
    player.setDisplayName(this.playerDisplayNames.get(socket.id) ?? "Unknown");

    // Apply saved player color if one exists for this socket
    const savedColor = this.playerColors.get(socket.id);
    if (savedColor) {
      player.setPlayerColor(savedColor);
    }

    player.serialized.set("experience", Math.max(0, Math.floor(initialExperience)));

    // Use the game mode strategy to handle player spawning
    // This allows each mode to determine spawn location (campsite for waves, random for battle royale)
    const gameModeStrategy = this.gameServer.getGameLoop().getGameModeStrategy();
    gameModeStrategy.handlePlayerSpawn(player, this.getGameManagers());

    this.players.set(socket.id, player);
    this.getEntityManager().addEntity(player);

    return player;
  }

  private broadcastPlayerJoined(player: Player): void {
    this.broadcastEvent(
      new PlayerJoinedEvent({ playerId: player.getId(), displayName: player.getDisplayName() }),
    );
  }

  public async recreatePlayersForConnectedSockets(): Promise<void> {
    this.players.clear();

    const sockets = Array.from(this.io.sockets.sockets.values());

    for (const socket of sockets) {
      const userId = this.userSessionCache.getUserIdBySocket(socket.id);
      const initialExperience = userId ? await this.fetchPersistedExperience(userId) : 0;
      this.createPlayerForSocket(socket, initialExperience);
    }
  }

  /**
   * Send initialization data (YOUR_ID + full state) to all connected sockets.
   * Call this AFTER broadcasting GAME_STARTED so clients receive it after resetting their state.
   */
  public sendInitializationToAllSockets(): void {
    const sockets = Array.from(this.io.sockets.sockets.values());
    const context = this.getHandlerContext();
    const gameMode = this.gameServer.getGameLoop().getGameModeStrategy().getConfig()
      .modeId as GameModeId;

    sockets.forEach((socket) => {
      const player = this.players.get(socket.id);
      if (player) {
        // Send YOUR_ID first so client knows their entity ID and game mode
        const yourIdEvent = new YourIdEvent(player.getId(), gameMode);
        this.sendEventToSocket(socket, yourIdEvent);

        // Then send full state with all entities and map data
        this.sendFullStateToSocket(context, socket);
      }
    });
  }

  /**
   * Send full game state to a specific socket
   */
  private sendFullStateToSocket(context: HandlerContext, socket: ISocketAdapter): void {
    sendFullState(context, socket);
  }

  public listen(): void {
    const implementation = getConfig().network.WEBSOCKET_IMPLEMENTATION;

    if (implementation === "uwebsockets") {
      // uWebSockets listens directly on the port - no HTTP server needed
      this.io.listen(this.port, () => {});
    } else {
      // Socket.IO: Listen using the HTTP server directly (which has Express attached)
      this.httpServer.listen(this.port, () => {});
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
        try {
          handlerRegistration.handler(context, socket, payload);
        } catch (error) {
          console.error(
            `Error handling event ${handlerRegistration.event} from socket ${socket.id}:`,
            error,
          );
        }
      });
    }
  }

  private async onConnection(socket: ISocketAdapter, initialExperience: number = 0): Promise<void> {
    const context = this.getHandlerContext();
    this.setupSocketListeners(socket);
    await onConnection(context, socket, initialExperience);
  }

  public broadcastEvent(event: GameEvent<any>): void {
    this.broadcaster.broadcastEvent(event);
  }

  /**
   * Send an event to a single socket (handles serialization automatically)
   */
  public sendEventToSocket(socket: ISocketAdapter, event: GameEvent<any>): void {
    const serializedData = event.serialize();
    const binaryBuffer = serializeServerEvent(event.getType(), [serializedData]);
    if (binaryBuffer !== null) {
      socket.emit(event.getType(), binaryBuffer);
    } else {
      console.error(`Failed to serialize event ${event.getType()} as binary buffer`);
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
