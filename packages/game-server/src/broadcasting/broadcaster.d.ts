import { GameEvent } from "@shared/events/types";
import { IServerAdapter } from "@shared/network/server-adapter";
import { IEntityManager } from "@/managers/types";
import { GameServer } from "@/core/server";
import { TickPerformanceTracker } from "@/util/tick-performance-tracker";
import { BufferManager } from "./buffer-manager";
export interface BroadcastDependencies {
    io: IServerAdapter;
    entityManager: IEntityManager;
    gameServer: GameServer;
    bufferManager: BufferManager;
    tickPerformanceTracker: TickPerformanceTracker | null;
}
/**
 * Handles all server → client event broadcasting logic.
 * Extracted from ServerSocketManager to separate concerns.
 */
export declare class Broadcaster {
    private deps;
    private totalBytesSent;
    private bytesSentThisSecond;
    private lastSecondTimestamp;
    private statsInterval;
    constructor(deps: BroadcastDependencies);
    /**
     * Calculate the byte size of event data
     */
    private calculateEventBytes;
    /**
     * Track bytes sent for a broadcast event
     */
    private trackBytesSent;
    /**
     * Get current bandwidth stats (bytes sent in the last second)
     */
    getCurrentBandwidth(): number;
    /**
     * Print bandwidth statistics every 5 seconds
     */
    private printStats;
    /**
     * Clean up resources (stop stats interval)
     */
    cleanup(): void;
    /**
     * Broadcast an event to all connected clients
     */
    broadcastEvent(event: GameEvent<any>): void;
    /**
     * Broadcast a game state update event (special handling for entity serialization)
     */
    private broadcastGameStateUpdate;
    /**
     * Broadcast a regular event (non-game-state-update)
     */
    private broadcastRegularEvent;
}
