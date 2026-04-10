import { Player } from "@/entities/players/player";
/**
 * Stats tracker service that listens for game events (zombie kills)
 * and batches them to send to the website API periodically.
 *
 * Batching reduces HTTP requests from potentially hundreds per second
 * to one request every 15 seconds per active user.
 */
export declare class KillTracker {
    private static instance;
    private userSessionCache;
    private playersMap;
    private isInitialized;
    private pendingStats;
    private batchInterval;
    private isSending;
    static getInstance(): KillTracker;
    private constructor();
    /**
     * Initialize the stats tracker with access to the players map
     * This allows us to look up socket IDs from player entity IDs
     */
    initialize(playersMap: Map<string, Player>): void;
    /**
     * Start the periodic batch send interval
     */
    private startBatchInterval;
    /**
     * Stop the batch interval (for cleanup)
     */
    shutdown(): void;
    /**
     * Get or create pending stats for a user
     */
    private getOrCreatePendingStats;
    /**
     * Handle zombie killed events
     * Accumulates kills in the pending stats for batch sending
     */
    private handleZombieKilled;
    private findPlayerByEntityId;
    /**
     * Persist experience immediately (per kill); does not block the game loop.
     */
    private sendExperienceDeltaFireAndForget;
    /**
     * Flush all pending stats to the API
     */
    private flushPendingStats;
    private findSocketIdByEntityId;
    private sendStatsToApi;
}
