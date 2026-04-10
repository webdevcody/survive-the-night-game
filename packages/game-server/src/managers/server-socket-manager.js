import { Player } from "@/entities/players/player";
import Inventory from "@/extensions/inventory";
import { ClientSentEvents } from "@shared/events/events";
import { EDITOR_WORLD_MAP_RELOAD_PATH, isEditorMapReloadRemoteAddrAllowed, isEditorWorldMapReloadHttpEnabled, isValidEditorMapReloadApiKey, } from "@/config/editor-map-reload";
import { createServer } from "http";
import { getConfig } from "@shared/config";
import { createCommandRegistry } from "@/commands";
import { RegExpMatcher, TextCensor, englishDataset, englishRecommendedTransformers, } from "obscenity";
import { createServerAdapter } from "@/network/adapter-factory";
import { BufferManager } from "@/broadcasting/buffer-manager";
import { Broadcaster as BroadcastingBroadcaster } from "@/broadcasting/broadcaster";
import { PlayerJoinedEvent } from "../../../game-shared/src/events/server-sent/events/player-joined-event";
import { VersionMismatchEvent } from "../../../game-shared/src/events/server-sent/events/version-mismatch-event";
import { AuthRequiredEvent } from "../../../game-shared/src/events/server-sent/events/auth-required-event";
import { YourIdEvent } from "../../../game-shared/src/events/server-sent/events/your-id-event";
import { onConnection, sendFullState } from "@/events/handlers";
import { socketEventHandlers } from "@/events/handlers/registry";
import { serializeServerEvent } from "@shared/events/server-sent/server-event-serialization";
import { SessionValidator } from "@/services/session-validator";
import { UserSessionCache } from "@/services/user-session-cache";
import { KillTracker } from "@/services/kill-tracker";
import { WEBSITE_API_URL, GAME_SERVER_API_KEY } from "@/config/env";
import { persistPlayerLastPositionToWebsite } from "@/services/persist-player-last-position";
import Positionable from "@/extensions/positionable";
import { coercePlayerQuestState } from "@shared/quests/player-quest-state";
import { coercePlayerInventoryPersistedPayload } from "@shared/util/persisted-inventory-payload";
import { reconcilePlayerQuestStateWithMap } from "@/quests/quest-runtime";
import { XP_PER_ZOMBIE_KILL } from "@shared/util/experience-level";
import { GameMessageEvent } from "../../../game-shared/src/events/server-sent/events/game-message-event";
/**
 * Any and all functionality related to sending server side events
 * or listening for client side events should live here.
 */
export class ServerSocketManager {
    constructor(port, gameServer) {
        this.players = new Map();
        this.playerDisplayNames = new Map();
        this.playerColors = new Map();
        this.tickPerformanceTracker = null;
        this.port = port;
        this.bufferManager = new BufferManager();
        const implementation = getConfig().network.WEBSOCKET_IMPLEMENTATION;
        // Create HTTP server for websocket adapter
        // Note: Biome editor API is now in a separate service (biome-editor-server)
        if (implementation === "socketio") {
            this.httpServer = createServer((req, res) => {
                this.handleNodeHttpRequest(req, res);
            });
        }
        else {
            // uWebSockets owns the game port; this Node server is never listened on.
            this.httpServer = createServer((req, res) => {
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
        if (isEditorWorldMapReloadHttpEnabled() && implementation === "uwebsockets") {
            this.io.setEditorReloadWorldMapHandler((res, req) => {
                this.handleEditorReloadWorldMapUws(res, req);
            });
        }
        // Initialize chat command registry
        this.chatCommandRegistry = createCommandRegistry();
        // Initialize profanity filter
        this.profanityMatcher = new RegExpMatcher(Object.assign(Object.assign({}, englishDataset.build()), englishRecommendedTransformers));
        this.profanityCensor = new TextCensor();
        // Initialize broadcaster (will be fully initialized after entityManager is set)
        this.broadcaster = new BroadcastingBroadcaster({
            io: this.io,
            entityManager: null, // Will be set when entityManager is set
            gameServer: this.gameServer,
            bufferManager: this.bufferManager,
            tickPerformanceTracker: this.tickPerformanceTracker,
        });
        // Initialize session services
        this.sessionValidator = SessionValidator.getInstance();
        this.userSessionCache = UserSessionCache.getInstance();
        // Initialize kill tracker with access to players map
        KillTracker.getInstance().initialize(this.players);
        this.io.on("connection", (socket) => {
            var _a;
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
                console.warn(`Version mismatch: client version ${clientVersion} does not match server version ${serverVersion}. Socket ${socket.id} will receive mismatch event.`);
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
            const authResult = this.sessionValidator.validateGameAuthToken(tokenStr !== null && tokenStr !== void 0 ? tokenStr : "");
            if (!authResult.valid || !authResult.userId) {
                const authRequiredEvent = new AuthRequiredEvent({
                    message: (_a = authResult.error) !== null && _a !== void 0 ? _a : "Authentication required",
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
            this.userSessionCache.setUserSession(socket.id, userId, tokenStr);
            console.log(`Socket ${socket.id} authenticated as user ${userId}`);
            void (async () => {
                const progress = await this.fetchPersistedProgress(userId);
                this.onConnection(socket, progress);
            })().catch((err) => {
                console.error("Connection handler failed:", err);
            });
        });
    }
    /**
     * Load persisted experience and allocation progress from the website DB before the player entity is created.
     */
    async fetchPersistedProgress(userId) {
        var _a, _b;
        const empty = {
            experience: 0,
            skillAllocations: {},
            characterAllocations: {},
        };
        if (!GAME_SERVER_API_KEY) {
            return empty;
        }
        const url = `${WEBSITE_API_URL}/api/game/player-experience?userId=${encodeURIComponent(userId)}`;
        try {
            const response = await fetch(url, {
                headers: { "X-API-Key": GAME_SERVER_API_KEY },
            });
            if (!response.ok) {
                const errText = await response.text().catch(() => "");
                console.warn(`[ServerSocketManager] player-experience HTTP ${response.status} for user ${userId}: ${errText.slice(0, 500)}`);
                return empty;
            }
            const data = (await response.json());
            const rawXp = data.experience;
            let xp = typeof rawXp === "number" && Number.isFinite(rawXp)
                ? Math.floor(rawXp)
                : typeof rawXp === "string" && rawXp.trim() !== ""
                    ? Math.max(0, Math.floor(Number(rawXp)))
                    : 0;
            const rawKills = data.zombieKills;
            const kills = typeof rawKills === "number" && Number.isFinite(rawKills)
                ? Math.floor(rawKills)
                : typeof rawKills === "string" && rawKills.trim() !== ""
                    ? Math.max(0, Math.floor(Number(rawKills)))
                    : 0;
            if (xp <= 0 && kills > 0) {
                xp = kills * XP_PER_ZOMBIE_KILL;
            }
            const rawLx = data.lastTileX;
            const rawLy = data.lastTileY;
            const lastTileX = typeof rawLx === "number" && Number.isFinite(rawLx) ? Math.floor(rawLx) : null;
            const lastTileY = typeof rawLy === "number" && Number.isFinite(rawLy) ? Math.floor(rawLy) : null;
            const rawRx = data.respawnTileX;
            const rawRy = data.respawnTileY;
            const respawnTileX = typeof rawRx === "number" && Number.isFinite(rawRx) ? Math.floor(rawRx) : null;
            const respawnTileY = typeof rawRy === "number" && Number.isFinite(rawRy) ? Math.floor(rawRy) : null;
            let savedInventory = undefined;
            const rawInv = data.savedInventory;
            if (rawInv != null && typeof rawInv === "object") {
                const coercedInv = coercePlayerInventoryPersistedPayload(rawInv);
                if (coercedInv) {
                    savedInventory = coercedInv;
                }
            }
            return {
                experience: Math.max(0, xp),
                skillAllocations: (_a = data.skillAllocations) !== null && _a !== void 0 ? _a : {},
                characterAllocations: (_b = data.characterAllocations) !== null && _b !== void 0 ? _b : {},
                lastTileX,
                lastTileY,
                respawnTileX,
                respawnTileY,
                questProgress: data.questProgress != null ? coercePlayerQuestState(data.questProgress) : undefined,
                savedInventory,
            };
        }
        catch (error) {
            console.warn(`[ServerSocketManager] fetchPersistedProgress failed for ${userId}:`, error);
        }
        return empty;
    }
    /**
     * Get handler context for passing to handler functions
     */
    getHandlerContext() {
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
            broadcastEvent: (event) => this.broadcastEvent(event),
            sendEventToSocket: (socket, event) => this.sendEventToSocket(socket, event),
            sanitizeText: (text) => this.sanitizeText(text),
            createPlayerForSocket: (socket, initialProgress) => this.createPlayerForSocket(socket, initialProgress),
            broadcastPlayerJoined: (player) => this.broadcastPlayerJoined(player),
        };
    }
    setGameManagers(gameManagers) {
        this.gameManagers = gameManagers;
    }
    setTickPerformanceTracker(tracker) {
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
    getCurrentBandwidth() {
        return this.broadcaster.getCurrentBandwidth();
    }
    getGameManagers() {
        if (!this.gameManagers) {
            throw new Error("Game managers not set");
        }
        return this.gameManagers;
    }
    getEntityManager() {
        if (!this.entityManager) {
            throw new Error("Entity manager not set");
        }
        return this.entityManager;
    }
    getMapManager() {
        if (!this.mapManager) {
            throw new Error("Map manager not set");
        }
        return this.mapManager;
    }
    setEntityManager(entityManager) {
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
    setMapManager(mapManager) {
        this.mapManager = mapManager;
    }
    createPlayerForSocket(socket, initialProgress = {
        experience: 0,
        skillAllocations: {},
        characterAllocations: {},
    }) {
        var _a;
        const player = new Player(this.getGameManagers());
        player.setDisplayName((_a = this.playerDisplayNames.get(socket.id)) !== null && _a !== void 0 ? _a : "Unknown");
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
    broadcastPlayerJoined(player) {
        this.broadcastEvent(new PlayerJoinedEvent({ playerId: player.getId(), displayName: player.getDisplayName() }));
    }
    async recreatePlayersForConnectedSockets() {
        const TILE_SIZE = getConfig().world.TILE_SIZE;
        const liveBySocket = new Map();
        for (const [socketId, player] of this.players) {
            if (player.isDead() || !player.hasExt(Positionable)) {
                continue;
            }
            const pos = player.getExt(Positionable).getPosition();
            const lastTileX = Math.floor(pos.x / TILE_SIZE);
            const lastTileY = Math.floor(pos.y / TILE_SIZE);
            const bind = player.getBoundRespawnTile();
            liveBySocket.set(socketId, Object.assign({ lastTileX,
                lastTileY }, (bind ? { respawn: { x: bind.x, y: bind.y } } : {})));
        }
        this.players.clear();
        const sockets = Array.from(this.io.sockets.sockets.values());
        for (const socket of sockets) {
            const userId = this.userSessionCache.getUserIdBySocket(socket.id);
            const progress = userId
                ? await this.fetchPersistedProgress(userId)
                : { experience: 0, skillAllocations: {}, characterAllocations: {} };
            const snap = liveBySocket.get(socket.id);
            const merged = snap
                ? Object.assign(Object.assign(Object.assign({}, progress), { lastTileX: snap.lastTileX, lastTileY: snap.lastTileY }), (snap.respawn
                    ? { respawnTileX: snap.respawn.x, respawnTileY: snap.respawn.y }
                    : {})) : progress;
            this.createPlayerForSocket(socket, merged);
        }
    }
    /** Align persisted quest journal with the current map (new/removed quest ids after reload). */
    reconcileConnectedPlayersQuestStateWithMap() {
        const map = this.getMapManager();
        for (const player of this.players.values()) {
            reconcilePlayerQuestStateWithMap(player, map);
        }
    }
    /**
     * Flush all connected players' tiles to the website before process shutdown
     * so reconnects after deploy use the last in-world position.
     */
    async persistConnectedPlayersLastPositions() {
        const tasks = [];
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
     * Send initialization data (YOUR_ID + full state) to all connected sockets.
     * Call this AFTER broadcasting GAME_STARTED so clients receive it after resetting their state.
     */
    sendInitializationToAllSockets() {
        const sockets = Array.from(this.io.sockets.sockets.values());
        const context = this.getHandlerContext();
        const gameMode = this.gameServer.getGameLoop().getGameModeStrategy().getConfig()
            .modeId;
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
    sendFullStateToSocket(context, socket) {
        sendFullState(context, socket);
    }
    listen() {
        const implementation = getConfig().network.WEBSOCKET_IMPLEMENTATION;
        if (implementation === "uwebsockets") {
            // uWebSockets listens directly on the port - no HTTP server needed
            this.io.listen(this.port, () => { });
        }
        else {
            // Socket.IO: Listen using the HTTP server directly (which has Express attached)
            this.httpServer.listen(this.port, () => { });
        }
    }
    setupSocketListeners(socket) {
        const context = this.getHandlerContext();
        // Automatically register all handlers from the registry
        for (const handlerRegistration of socketEventHandlers) {
            const eventName = handlerRegistration.event === "disconnect"
                ? "disconnect"
                : ClientSentEvents[handlerRegistration.event];
            socket.on(eventName, (payload) => {
                try {
                    handlerRegistration.handler(context, socket, payload);
                }
                catch (error) {
                    console.error(`Error handling event ${handlerRegistration.event} from socket ${socket.id}:`, error);
                }
            });
        }
    }
    onConnection(socket, initialProgress = {
        experience: 0,
        skillAllocations: {},
        characterAllocations: {},
    }) {
        const context = this.getHandlerContext();
        this.setupSocketListeners(socket);
        onConnection(context, socket, initialProgress);
    }
    broadcastEvent(event) {
        this.broadcaster.broadcastEvent(event);
    }
    /**
     * Send an event to a single socket (handles serialization automatically)
     */
    sendEventToSocket(socket, event) {
        const serializedData = event.serialize();
        const binaryBuffer = serializeServerEvent(event.getType(), [serializedData]);
        if (binaryBuffer !== null) {
            socket.emit(event.getType(), binaryBuffer);
        }
        else {
            console.error(`Failed to serialize event ${event.getType()} as binary buffer`);
        }
    }
    /**
     * Send a {@link GameMessageEvent} to the socket controlling the given player entity (if any).
     * Same client path as broadcast HUD messages: {@code onGameMessage} → {@code Hud.addMessage}.
     */
    sendGameMessageToPlayerEntity(playerEntityId, message, color) {
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
    httpPathname(req) {
        var _a;
        const raw = (_a = req.url) !== null && _a !== void 0 ? _a : "/";
        const q = raw.indexOf("?");
        return q === -1 ? raw : raw.slice(0, q);
    }
    sendJsonHttp(res, status, body) {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(body));
    }
    handleNodeHttpRequest(req, res) {
        var _a;
        const pathname = this.httpPathname(req);
        // Socket.IO registers another "request" listener; do not end the response for its paths.
        if (pathname.startsWith("/socket.io")) {
            return;
        }
        if (isEditorWorldMapReloadHttpEnabled() &&
            req.method === "POST" &&
            pathname === EDITOR_WORLD_MAP_RELOAD_PATH) {
            const remote = (_a = req.socket.remoteAddress) !== null && _a !== void 0 ? _a : undefined;
            if (!isEditorMapReloadRemoteAddrAllowed(remote)) {
                console.warn(`[EditorMapReload] rejected: non-loopback remote ${remote !== null && remote !== void 0 ? remote : "(none)"}`);
                this.sendJsonHttp(res, 403, { ok: false, error: "Forbidden" });
                return;
            }
            const header = req.headers["x-game-server-api-key"];
            const key = Array.isArray(header) ? header[0] : header;
            if (!isValidEditorMapReloadApiKey(key)) {
                console.warn("[EditorMapReload] rejected: bad or missing x-game-server-api-key");
                this.sendJsonHttp(res, 401, { ok: false, error: "Unauthorized" });
                return;
            }
            void this.gameServer.startNewGame().then(() => {
                this.sendJsonHttp(res, 200, { ok: true });
            }, (err) => {
                console.error("[EditorMapReload] startNewGame failed:", err);
                this.sendJsonHttp(res, 500, { ok: false, error: "Reload failed" });
            });
            return;
        }
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
    }
    handleEditorReloadWorldMapUws(res, req) {
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
        void this.gameServer.startNewGame().then(() => {
            res.writeStatus("200 OK");
            res.writeHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
        }, (err) => {
            console.error("[EditorMapReload] startNewGame failed:", err);
            res.writeStatus("500 Internal Server Error");
            res.writeHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: "Reload failed" }));
        });
    }
    /**
     * Sanitize text by replacing profane words with asterisks
     */
    sanitizeText(text) {
        const matches = this.profanityMatcher.getAllMatches(text);
        return this.profanityCensor.applyTo(text, matches);
    }
}
