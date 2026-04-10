import { GameEvent } from "@shared/events/types";
import { GameServer } from "@/core/server";
import { MapManager } from "@/world/map-manager";
import { Broadcaster, IEntityManager, IGameManagers } from "@/managers/types";
import { TickPerformanceTracker } from "@/util/tick-performance-tracker";
import { ISocketAdapter } from "@shared/network/socket-adapter";
/**
 * Any and all functionality related to sending server side events
 * or listening for client side events should live here.
 */
export declare class ServerSocketManager implements Broadcaster {
    private io;
    private players;
    private playerDisplayNames;
    private playerColors;
    private port;
    private httpServer;
    private entityManager?;
    private mapManager?;
    private gameServer;
    private gameManagers?;
    private chatCommandRegistry;
    private profanityMatcher;
    private profanityCensor;
    private tickPerformanceTracker;
    private bufferManager;
    private broadcaster;
    private sessionValidator;
    private userSessionCache;
    constructor(port: number, gameServer: GameServer);
    /**
     * Load persisted experience and allocation progress from the website DB before the player entity is created.
     */
    private fetchPersistedProgress;
    /**
     * Get handler context for passing to handler functions
     */
    private getHandlerContext;
    setGameManagers(gameManagers: IGameManagers): void;
    setTickPerformanceTracker(tracker: TickPerformanceTracker): void;
    getCurrentBandwidth(): number;
    getGameManagers(): IGameManagers;
    getEntityManager(): IEntityManager;
    getMapManager(): MapManager;
    setEntityManager(entityManager: IEntityManager): void;
    setMapManager(mapManager: MapManager): void;
    private createPlayerForSocket;
    private broadcastPlayerJoined;
    recreatePlayersForConnectedSockets(): Promise<void>;
    /** Align persisted quest journal with the current map (new/removed quest ids after reload). */
    reconcileConnectedPlayersQuestStateWithMap(): void;
    /**
     * Flush all connected players' tiles to the website before process shutdown
     * so reconnects after deploy use the last in-world position.
     */
    persistConnectedPlayersLastPositions(): Promise<void>;
    /**
     * Send initialization data (YOUR_ID + full state) to all connected sockets.
     * Call this AFTER broadcasting GAME_STARTED so clients receive it after resetting their state.
     */
    sendInitializationToAllSockets(): void;
    /**
     * Send full game state to a specific socket
     */
    private sendFullStateToSocket;
    listen(): void;
    private setupSocketListeners;
    private onConnection;
    broadcastEvent(event: GameEvent<any>): void;
    /**
     * Send an event to a single socket (handles serialization automatically)
     */
    sendEventToSocket(socket: ISocketAdapter, event: GameEvent<any>): void;
    /**
     * Send a {@link GameMessageEvent} to the socket controlling the given player entity (if any).
     * Same client path as broadcast HUD messages: {@code onGameMessage} → {@code Hud.addMessage}.
     */
    sendGameMessageToPlayerEntity(playerEntityId: number, message: string, color?: string): void;
    private httpPathname;
    private sendJsonHttp;
    private handleNodeHttpRequest;
    private handleEditorReloadWorldMapUws;
    /**
     * Sanitize text by replacing profane words with asterisks
     */
    private sanitizeText;
}
