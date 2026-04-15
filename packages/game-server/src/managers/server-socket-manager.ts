import { Player } from "@/entities/players/player";
import Inventory from "@/extensions/inventory";
import { ClientSentEvents } from "@shared/events/events";
import { GameEvent } from "@shared/events/types";
import { GameServer } from "@/core/server";
import {
  isEditorWorldMapReloadHttpEnabled,
  isValidEditorMapReloadApiKey,
} from "@/config/editor-map-reload";
import { createServer } from "http";
import { randomUUID } from "crypto";
import os from "os";
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
import { UWebSocketsServerAdapter } from "@/network/uwebsockets-server-adapter";
import { BufferManager } from "@/broadcasting/buffer-manager";
import { Broadcaster as BroadcastingBroadcaster } from "@/broadcasting/broadcaster";
import { PlayerJoinedEvent } from "../../../game-shared/src/events/server-sent/events/player-joined-event";
import { VersionMismatchEvent } from "../../../game-shared/src/events/server-sent/events/version-mismatch-event";
import { AuthRequiredEvent } from "../../../game-shared/src/events/server-sent/events/auth-required-event";
import { ProfileLoadFailedEvent } from "../../../game-shared/src/events/server-sent/events/profile-load-failed-event";
import { DuplicateActiveSessionEvent } from "../../../game-shared/src/events/server-sent/events/duplicate-active-session-event";
import { SessionIdleTimeoutEvent } from "../../../game-shared/src/events/server-sent/events/session-idle-timeout-event";
import { YourIdEvent } from "../../../game-shared/src/events/server-sent/events/your-id-event";
import type { GameModeId } from "@shared/events/server-sent/events/game-started-event";
import { HandlerContext, onConnection, sendFullState } from "@/events/handlers";
import { socketEventHandlers } from "@/events/handlers/registry";
import { serializeServerEvent } from "@shared/events/server-sent/server-event-serialization";
import { SessionValidator } from "@/services/session-validator";
import { UserSessionCache } from "@/services/user-session-cache";
import { KillTracker } from "@/services/kill-tracker";
import { WEBSITE_API_URL, GAME_SERVER_API_KEY, GAME_SERVER_ID } from "@/config/env";
import {
  clearServerSessionLeasesOnWebsite,
  heartbeatGameServerRegistryOnWebsite,
  isGameServerRegistryConfigured,
  registerGameServerToWebsite,
} from "@/services/game-server-registry-api";
import type { PersistedPlayerProgress } from "@/services/player-progress-types";
import {
  getPersistablePlayerLastTile,
  persistPlayerLastPositionToWebsite,
} from "@/services/persist-player-last-position";
import {
  claimPlayerGameSessionToWebsite,
  heartbeatPlayerGameSessionToWebsite,
  releasePlayerGameSessionToWebsite,
} from "@/services/persist-player-game-session";
import Positionable from "@/extensions/positionable";
import { coercePlayerQuestState } from "@shared/quests/player-quest-state";
import { coercePlayerInventoryPersistedPayload } from "@shared/util/persisted-inventory-payload";
import { coercePlayerBankPersistedPayload } from "@shared/util/persisted-bank-payload";
import { coerceMapExplorationPayload } from "@shared/util/map-exploration-payload";
import { emptyProfessionProgress, normalizeProfessionProgress } from "@shared/util/professions";
import { reconcilePlayerQuestStateWithMap } from "@/quests/quest-runtime";
import { XP_PER_ZOMBIE_KILL } from "@shared/util/experience-level";
import { GameMessageEvent } from "../../../game-shared/src/events/server-sent/events/game-message-event";
import uWS from "uwebsockets.js";

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
  /** Identifies this game-server process for distributed session leases (env or host:port:pid). */
  private readonly gameServerInstanceId: string;
  /** socketId -> lease heartbeat row */
  private leaseHeartbeatBySocket: Map<string, { userId: string; gameSessionId: string }> =
    new Map();
  private leaseHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly LEASE_HEARTBEAT_INTERVAL_MS = 45_000;
  /** Last time each socket sent a gameplay-related message (excludes PING / PING_UPDATE). */
  private lastGameplayActivityBySocket: Map<string, number> = new Map();
  private idleKickTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly IDLE_KICK_AFTER_MS = 5 * 60 * 1000;
  private static readonly IDLE_KICK_CHECK_INTERVAL_MS = 30_000;
  private registryHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly REGISTRY_HEARTBEAT_INTERVAL_MS = 30_000;

  constructor(port: number, gameServer: GameServer) {
    this.port = port;
    this.gameServerInstanceId = /^\d+$/.test(GAME_SERVER_ID)
      ? GAME_SERVER_ID
      : process.env.GAME_SERVER_INSTANCE_ID?.trim() || `${os.hostname()}:${port}:${process.pid}`;
    this.bufferManager = new BufferManager();

    // uWebSockets owns the game port; this Node server only satisfies the shared adapter interface.
    const httpServer = createServer((req, res) => {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    });

    this.io = createServerAdapter(httpServer, {
      origin: "*",
      methods: ["GET", "POST"],
    });

    this.gameServer = gameServer;

    if (isEditorWorldMapReloadHttpEnabled()) {
      (this.io as UWebSocketsServerAdapter).setEditorReloadWorldMapHandler((res, req) => {
        this.handleEditorReloadWorldMapUws(res, req);
      });
    }

    (this.io as UWebSocketsServerAdapter).setPublicStatusProvider(() => ({
      playerCount: this.players.size,
    }));

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

      const filteredDisplayName = rawDisplayName ? this.sanitizeText(rawDisplayName) : undefined;

      void (async () => {
        const loaded = await this.fetchPersistedProgress(userId);
        if (!loaded.ok) {
          console.warn(
            `[ServerSocketManager] Refusing connection for user ${userId}: persisted profile not loaded.`,
          );
          this.sendEventToSocket(
            socket,
            new ProfileLoadFailedEvent({
              message: loaded.message,
            }),
          );
          socket.disconnect(true);
          return;
        }

        const gameSessionId = randomUUID();
        const claimed = await claimPlayerGameSessionToWebsite(
          userId,
          gameSessionId,
          this.gameServerInstanceId,
        );
        if (!claimed.ok) {
          const message =
            claimed.reason === "active_session"
              ? "This account is already playing the game in another tab or session. Close that session and try again."
              : "Could not verify your game session. Please try again in a moment.";
          console.warn(
            `[ServerSocketManager] Refusing connection for user ${userId}: game session claim failed (${claimed.reason}).`,
          );
          this.sendEventToSocket(socket, new DuplicateActiveSessionEvent({ message }));
          socket.disconnect(true);
          return;
        }

        this.playerDisplayNames.set(socket.id, filteredDisplayName || "Unknown");
        this.userSessionCache.setUserSession(socket.id, userId, tokenStr!, { gameSessionId });
        this.registerLeaseHeartbeat(socket.id, userId, gameSessionId);
        this.ensureLeaseHeartbeatLoop();
        this.touchGameplayActivity(socket.id);
        this.ensureIdleKickLoop();
        console.log(`Socket ${socket.id} authenticated as user ${userId}`);

        this.onConnection(socket, loaded.progress);
      })().catch((err) => {
        console.error("Connection handler failed:", err);
        this.sendEventToSocket(
          socket,
          new ProfileLoadFailedEvent({
            message:
              "Could not load your saved progress. Please try again in a moment.",
          }),
        );
        socket.disconnect(true);
      });
    });
  }

  private static readonly PROFILE_LOAD_USER_MESSAGE =
    "Could not load your saved progress. Please try again in a moment.";

  /**
   * Load persisted experience and allocation progress from the website DB before the player entity is created.
   * When GAME_SERVER_API_KEY is set, failure is explicit (caller must refuse connection).
   */
  private async fetchPersistedProgress(
    userId: string,
  ): Promise<
    { ok: true; progress: PersistedPlayerProgress } | { ok: false; message: string }
  > {
    const empty: PersistedPlayerProgress = {
      experience: 0,
      abilityAllocations: {},
      characterAllocations: {},
      professionProgress: emptyProfessionProgress(),
    };
    if (!GAME_SERVER_API_KEY) {
      return { ok: true, progress: empty };
    }

    const url = `${WEBSITE_API_URL}/api/game/player-experience?userId=${encodeURIComponent(userId)}`;

    try {
      const response = await fetch(url, {
        headers: { "X-API-Key": GAME_SERVER_API_KEY },
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.warn(
          `[ServerSocketManager] player-experience HTTP ${response.status} for user ${userId}: ${errText.slice(0, 500)}`,
        );
        return { ok: false, message: ServerSocketManager.PROFILE_LOAD_USER_MESSAGE };
      }
      const data = (await response.json()) as {
        experience?: unknown;
        zombieKills?: unknown;
        abilityAllocations?: Record<string, number>;
        skillAllocations?: Record<string, number>;
        characterAllocations?: Record<string, number>;
        professionProgress?: unknown;
        lastTileX?: unknown;
        lastTileY?: unknown;
        respawnTileX?: unknown;
        respawnTileY?: unknown;
        questProgress?: unknown;
        savedInventory?: unknown;
        savedBank?: unknown;
        mapExploration?: unknown;
      };
      const rawXp = data.experience;
      let xp =
        typeof rawXp === "number" && Number.isFinite(rawXp)
          ? Math.floor(rawXp)
          : typeof rawXp === "string" && rawXp.trim() !== ""
            ? Math.max(0, Math.floor(Number(rawXp)))
            : 0;
      const rawKills = data.zombieKills;
      const kills =
        typeof rawKills === "number" && Number.isFinite(rawKills)
          ? Math.floor(rawKills)
          : typeof rawKills === "string" && rawKills.trim() !== ""
            ? Math.max(0, Math.floor(Number(rawKills)))
            : 0;
      if (xp <= 0 && kills > 0) {
        xp = kills * XP_PER_ZOMBIE_KILL;
      }
      const rawLx = data.lastTileX;
      const rawLy = data.lastTileY;
      const lastTileX =
        typeof rawLx === "number" && Number.isFinite(rawLx) ? Math.floor(rawLx) : null;
      const lastTileY =
        typeof rawLy === "number" && Number.isFinite(rawLy) ? Math.floor(rawLy) : null;

      const rawRx = data.respawnTileX;
      const rawRy = data.respawnTileY;
      const respawnTileX =
        typeof rawRx === "number" && Number.isFinite(rawRx) ? Math.floor(rawRx) : null;
      const respawnTileY =
        typeof rawRy === "number" && Number.isFinite(rawRy) ? Math.floor(rawRy) : null;

      let savedInventory: PersistedPlayerProgress["savedInventory"] = undefined;
      const rawInv = data.savedInventory;
      if (rawInv != null && typeof rawInv === "object") {
        const coercedInv = coercePlayerInventoryPersistedPayload(rawInv);
        if (coercedInv) {
          savedInventory = coercedInv;
        }
      }
      if (savedInventory == null) {
        console.warn(
          `[ServerSocketManager] player-experience missing valid savedInventory for user ${userId}.`,
        );
        return { ok: false, message: ServerSocketManager.PROFILE_LOAD_USER_MESSAGE };
      }

      let savedBank: NonNullable<PersistedPlayerProgress["savedBank"]> | undefined;
      const rawBank = data.savedBank;
      if (rawBank != null && typeof rawBank === "object") {
        const coercedBank = coercePlayerBankPersistedPayload(rawBank);
        if (coercedBank) {
          savedBank = coercedBank;
        }
      }
      if (savedBank == null) {
        savedBank = coercePlayerBankPersistedPayload({ items: [] })!;
      }

      let mapExploration: PersistedPlayerProgress["mapExploration"] = undefined;
      const rawExpl = data.mapExploration;
      if (rawExpl != null && typeof rawExpl === "object") {
        const coercedEx = coerceMapExplorationPayload(rawExpl);
        if (coercedEx) {
          mapExploration = coercedEx;
        }
      }

      return {
        ok: true,
        progress: {
          experience: Math.max(0, xp),
          abilityAllocations: data.abilityAllocations ?? data.skillAllocations ?? {},
          characterAllocations: data.characterAllocations ?? {},
          professionProgress: normalizeProfessionProgress(data.professionProgress),
          lastTileX,
          lastTileY,
          respawnTileX,
          respawnTileY,
          questProgress:
            data.questProgress != null ? coercePlayerQuestState(data.questProgress) : undefined,
          savedInventory,
          savedBank,
          mapExploration,
        },
      };
    } catch (error) {
      console.warn(`[ServerSocketManager] fetchPersistedProgress failed for ${userId}:`, error);
      return { ok: false, message: ServerSocketManager.PROFILE_LOAD_USER_MESSAGE };
    }
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
      notifyDistributedSessionSocketClosing: (s) => this.handleDistributedSessionSocketClosing(s),
      clearGameplayIdleTracking: (s) => this.clearGameplayIdleTrackingForSocket(s),
      getEntityManager: () => this.getEntityManager(),
      getMapManager: () => this.getMapManager(),
      getGameManagers: () => this.getGameManagers(),
      broadcastEvent: (event: GameEvent<any>) => this.broadcastEvent(event),
      sendEventToSocket: (socket: ISocketAdapter, event: GameEvent<any>) =>
        this.sendEventToSocket(socket, event),
      sanitizeText: (text: string) => this.sanitizeText(text),
      createPlayerForSocket: (socket: ISocketAdapter, initialProgress?: PersistedPlayerProgress) =>
        this.createPlayerForSocket(socket, initialProgress),
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

  private createPlayerForSocket(
    socket: ISocketAdapter,
    initialProgress: PersistedPlayerProgress = {
      experience: 0,
      abilityAllocations: {},
      characterAllocations: {},
      professionProgress: emptyProfessionProgress(),
    },
  ): Player {
    const player = new Player(this.getGameManagers());
    player.setDisplayName(this.playerDisplayNames.get(socket.id) ?? "Unknown");

    // Apply saved player color if one exists for this socket
    const savedColor = this.playerColors.get(socket.id);
    if (savedColor) {
      player.setPlayerColor(savedColor);
    }

    player.hydratePersistedProgress(initialProgress);
    player.setClientSocketId(socket.id);

    if (initialProgress.savedInventory == null) {
      player.getExt(Inventory).addItem({ itemType: "torch" });
    }

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
    type LiveSnap = PersistedPlayerProgress;
    const liveBySocket = new Map<string, LiveSnap>();

    for (const [socketId, player] of this.players) {
      const bind = player.getBoundRespawnTile();
      const snap: LiveSnap = {
        experience: player.getTotalExperience(),
        abilityAllocations: player.getAbilityAllocationRecord(),
        characterAllocations: player.getCharacterAllocationRecord(),
        professionProgress: player.getProfessionProgressRecord(),
        questProgress: player.getQuestProgressPayload(),
        savedInventory: player.getSavedInventoryPayload(),
        savedBank: player.getSavedBankPayload(),
        mapExploration: player.getMapExplorationPayload(),
      };
      if (!player.isDead() && player.hasExt(Positionable)) {
        const lastTile = getPersistablePlayerLastTile(player);
        if (lastTile) {
          snap.lastTileX = lastTile.x;
          snap.lastTileY = lastTile.y;
        }
      }
      if (bind) {
        snap.respawnTileX = bind.x;
        snap.respawnTileY = bind.y;
      }
      liveBySocket.set(socketId, snap);
    }

    this.players.clear();

    const sockets = Array.from(this.io.sockets.sockets.values());

    const anonProgress: PersistedPlayerProgress = {
      experience: 0,
      abilityAllocations: {},
      characterAllocations: {},
      professionProgress: emptyProfessionProgress(),
    };

    for (const socket of sockets) {
      const snap = liveBySocket.get(socket.id);
      if (snap) {
        this.createPlayerForSocket(socket, snap);
        continue;
      }

      const userId = this.userSessionCache.getUserIdBySocket(socket.id);
      const loaded = userId
        ? await this.fetchPersistedProgress(userId)
        : { ok: true as const, progress: anonProgress };

      if (!loaded.ok) {
        console.warn(
          `[ServerSocketManager] Kicking socket ${socket.id} during map reload: persisted profile not loaded.`,
        );
        this.sendEventToSocket(
          socket,
          new ProfileLoadFailedEvent({ message: loaded.message }),
        );
        const kickUserId = this.userSessionCache.getUserIdBySocket(socket.id);
        const kickLease = this.userSessionCache.getGameSessionLeaseBySocket(socket.id);
        if (kickUserId && kickLease) {
          void releasePlayerGameSessionToWebsite(kickUserId, kickLease.gameSessionId);
        }
        this.clearLeaseHeartbeat(socket.id);
        this.userSessionCache.removeSocket(socket.id);
        socket.disconnect(true);
        continue;
      }

      this.createPlayerForSocket(socket, loaded.progress);
    }
  }

  /** Align persisted quest journal with the current map (new/removed quest ids after reload). */
  public reconcileConnectedPlayersQuestStateWithMap(): void {
    const map = this.getMapManager();
    for (const player of this.players.values()) {
      reconcilePlayerQuestStateWithMap(player, map);
    }
  }

  /**
   * Flush all connected players' tiles to the website before process shutdown
   * so reconnects after deploy use the last in-world position.
   */
  public async persistConnectedPlayersLastPositions(): Promise<void> {
    const tasks: Promise<void>[] = [];
    for (const [socketId, player] of this.players) {
      const userId = this.userSessionCache.getUserIdBySocket(socketId);
      if (!userId) {
        continue;
      }
      tasks.push(persistPlayerLastPositionToWebsite(userId, player));
    }
    await Promise.all(tasks);
  }

  /**
   * Release distributed session leases for all sockets (graceful shutdown).
   */
  public async releaseAllDistributedGameSessionLeases(): Promise<void> {
    const tasks: Promise<void>[] = [];
    for (const socketId of this.userSessionCache.getAuthenticatedSocketIds()) {
      const userId = this.userSessionCache.getUserIdBySocket(socketId);
      const lease = this.userSessionCache.getGameSessionLeaseBySocket(socketId);
      if (userId && lease) {
        tasks.push(releasePlayerGameSessionToWebsite(userId, lease.gameSessionId));
      }
    }
    this.leaseHeartbeatBySocket.clear();
    this.lastGameplayActivityBySocket.clear();
    if (this.leaseHeartbeatTimer) {
      clearInterval(this.leaseHeartbeatTimer);
      this.leaseHeartbeatTimer = null;
    }
    if (this.idleKickTimer) {
      clearInterval(this.idleKickTimer);
      this.idleKickTimer = null;
    }
    if (this.registryHeartbeatTimer) {
      clearInterval(this.registryHeartbeatTimer);
      this.registryHeartbeatTimer = null;
    }
    await Promise.all(tasks);
  }

  private registerLeaseHeartbeat(socketId: string, userId: string, gameSessionId: string): void {
    this.leaseHeartbeatBySocket.set(socketId, { userId, gameSessionId });
  }

  private clearLeaseHeartbeat(socketId: string): void {
    this.leaseHeartbeatBySocket.delete(socketId);
  }

  private handleDistributedSessionSocketClosing(socket: ISocketAdapter): void {
    this.clearLeaseHeartbeat(socket.id);
  }

  private touchGameplayActivity(socketId: string): void {
    this.lastGameplayActivityBySocket.set(socketId, Date.now());
  }

  private clearGameplayIdleTrackingForSocket(socket: ISocketAdapter): void {
    this.lastGameplayActivityBySocket.delete(socket.id);
  }

  private ensureIdleKickLoop(): void {
    if (this.idleKickTimer) {
      return;
    }
    this.idleKickTimer = setInterval(() => {
      this.runIdleKicks();
    }, ServerSocketManager.IDLE_KICK_CHECK_INTERVAL_MS);
  }

  private runIdleKicks(): void {
    const now = Date.now();
    const threshold = ServerSocketManager.IDLE_KICK_AFTER_MS;
    const idleMinutes = Math.floor(threshold / 60_000);

    for (const [socketId, lastMs] of this.lastGameplayActivityBySocket.entries()) {
      if (now - lastMs < threshold) {
        continue;
      }
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket) {
        this.lastGameplayActivityBySocket.delete(socketId);
        continue;
      }
      console.warn(
        `[ServerSocketManager] Kicking socket ${socketId}: no gameplay activity for ${threshold}ms`,
      );
      this.sendEventToSocket(
        socket,
        new SessionIdleTimeoutEvent({
          message: `Disconnected after ${idleMinutes} minutes of inactivity.`,
        }),
      );
      socket.disconnect(true);
    }
  }

  private ensureLeaseHeartbeatLoop(): void {
    if (this.leaseHeartbeatTimer) {
      return;
    }
    this.leaseHeartbeatTimer = setInterval(() => {
      void this.runLeaseHeartbeats();
    }, ServerSocketManager.LEASE_HEARTBEAT_INTERVAL_MS);
  }

  private async runLeaseHeartbeats(): Promise<void> {
    const entries = Array.from(this.leaseHeartbeatBySocket.entries());
    for (const [socketId, { userId, gameSessionId }] of entries) {
      const { stillOwner } = await heartbeatPlayerGameSessionToWebsite(userId, gameSessionId);
      if (stillOwner) {
        continue;
      }
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        this.sendEventToSocket(
          socket,
          new DuplicateActiveSessionEvent({
            message:
              "Your game session is no longer valid. Another connection may have taken over this account.",
          }),
        );
        socket.disconnect(true);
      }
      this.clearLeaseHeartbeat(socketId);
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
    this.io.listen(this.port, () => {});
  }

  /**
   * Before accepting WebSockets: clear stale session leases for this stable server id (if configured),
   * register in the website server list (if configured), and start registry heartbeats.
   */
  public async runPreListenWebsiteBootstrap(): Promise<void> {
    if (GAME_SERVER_API_KEY && /^\d+$/.test(GAME_SERVER_ID)) {
      try {
        await clearServerSessionLeasesOnWebsite(this.gameServerInstanceId);
      } catch (e) {
        console.warn(
          "[bootstrap] clear_server_leases failed (website may be down; start packages/website first):",
          e instanceof Error ? e.message : e,
        );
      }
    }

    if (isGameServerRegistryConfigured()) {
      await registerGameServerToWebsite(this.port);
      this.ensureRegistryHeartbeatLoop();
    }
  }

  private ensureRegistryHeartbeatLoop(): void {
    if (this.registryHeartbeatTimer) {
      return;
    }
    this.registryHeartbeatTimer = setInterval(() => {
      void heartbeatGameServerRegistryOnWebsite(this.port);
    }, ServerSocketManager.REGISTRY_HEARTBEAT_INTERVAL_MS);
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
        if (handlerRegistration.event !== "disconnect") {
          if (
            handlerRegistration.event !== "PING" &&
            handlerRegistration.event !== "PING_UPDATE"
          ) {
            this.touchGameplayActivity(socket.id);
          }
        }
        void Promise.resolve()
          .then(() => handlerRegistration.handler(context, socket, payload))
          .catch((error) => {
            console.error(
              `Error handling event ${handlerRegistration.event} from socket ${socket.id}:`,
              error,
            );
          });
      });
    }
  }

  private onConnection(
    socket: ISocketAdapter,
    initialProgress: PersistedPlayerProgress = {
      experience: 0,
      abilityAllocations: {},
      characterAllocations: {},
      professionProgress: emptyProfessionProgress(),
    },
  ): void {
    const context = this.getHandlerContext();
    this.setupSocketListeners(socket);
    onConnection(context, socket, initialProgress);
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
   * Send a {@link GameMessageEvent} to the socket controlling the given player entity (if any).
   * Same client path as broadcast HUD messages: {@code onGameMessage} → {@code Hud.addMessage}.
   */
  public sendGameMessageToPlayerEntity(
    playerEntityId: number,
    message: string,
    color?: string,
  ): void {
    for (const [socketId, p] of this.players) {
      if (p.getId() !== playerEntityId) {
        continue;
      }
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        this.sendEventToSocket(socket, new GameMessageEvent({ message, color }));
      }
      return;
    }
  }

  private handleEditorReloadWorldMapUws(res: uWS.HttpResponse, req: uWS.HttpRequest): void {
    if (!isEditorWorldMapReloadHttpEnabled()) {
      res.writeStatus("404 Not Found");
      res.writeHeader("Content-Type", "text/plain");
      res.end("Not Found");
      return;
    }
    const key = req.getHeader("x-game-server-api-key");
    if (!isValidEditorMapReloadApiKey(key)) {
      res.writeStatus("401 Unauthorized");
      res.writeHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
      return;
    }
    void this.gameServer.startNewGame().then(
      () => {
        res.writeStatus("200 OK");
        res.writeHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true }));
      },
      (err) => {
        console.error("[EditorMapReload] startNewGame failed:", err);
        res.writeStatus("500 Internal Server Error");
        res.writeHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "Reload failed" }));
      },
    );
  }

  /**
   * Sanitize text by replacing profane words with asterisks
   */
  private sanitizeText(text: string): string {
    const matches = this.profanityMatcher.getAllMatches(text);
    return this.profanityCensor.applyTo(text, matches);
  }
}
