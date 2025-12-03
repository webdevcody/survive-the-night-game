import { WEBSITE_API_URL, GAME_SERVER_API_KEY } from "@/config/env";
import { gameEventBus, ZombieKilledEventData, WaveCompletedEventData } from "./game-event-bus";
import { UserSessionCache } from "./user-session-cache";
import { Player } from "@/entities/players/player";

const BATCH_INTERVAL_MS = 15000; // Send stats every 15 seconds

interface PendingStats {
  zombieKills: number;
  wavesCompleted: number;
  maxWave: number;
}

/**
 * Stats tracker service that listens for game events (zombie kills, waves)
 * and batches them to send to the website API periodically.
 *
 * Batching reduces HTTP requests from potentially hundreds per second
 * to one request every 15 seconds per active user.
 */
export class KillTracker {
  private static instance: KillTracker;
  private userSessionCache: UserSessionCache;
  private playersMap: Map<string, Player> | null = null;
  private isInitialized = false;

  // Accumulates stats per user until the next batch send
  private pendingStats: Map<string, PendingStats> = new Map();
  private batchInterval: NodeJS.Timeout | null = null;
  private isSending = false;

  static getInstance(): KillTracker {
    if (!KillTracker.instance) {
      KillTracker.instance = new KillTracker();
    }
    return KillTracker.instance;
  }

  private constructor() {
    this.userSessionCache = UserSessionCache.getInstance();
  }

  /**
   * Initialize the stats tracker with access to the players map
   * This allows us to look up socket IDs from player entity IDs
   */
  initialize(playersMap: Map<string, Player>): void {
    if (this.isInitialized) {
      return;
    }

    this.playersMap = playersMap;
    this.isInitialized = true;

    // Subscribe to game events
    gameEventBus.onZombieKilled(this.handleZombieKilled.bind(this));
    gameEventBus.onWaveCompleted(this.handleWaveCompleted.bind(this));

    // Start the batch send interval
    this.startBatchInterval();

    console.log("KillTracker initialized with 15s batching (kills + waves)");
  }

  /**
   * Start the periodic batch send interval
   */
  private startBatchInterval(): void {
    if (this.batchInterval) {
      return;
    }

    this.batchInterval = setInterval(() => {
      this.flushPendingStats();
    }, BATCH_INTERVAL_MS);
  }

  /**
   * Stop the batch interval (for cleanup)
   */
  shutdown(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    // Attempt to flush any remaining stats
    this.flushPendingStats();
  }

  /**
   * Get or create pending stats for a user
   */
  private getOrCreatePendingStats(userId: string): PendingStats {
    let stats = this.pendingStats.get(userId);
    if (!stats) {
      stats = { zombieKills: 0, wavesCompleted: 0, maxWave: 0 };
      this.pendingStats.set(userId, stats);
    }
    return stats;
  }

  /**
   * Handle zombie killed events
   * Accumulates kills in the pending stats for batch sending
   */
  private handleZombieKilled(data: ZombieKilledEventData): void {
    if (!this.playersMap) {
      return;
    }

    // Find the socket ID for the killer entity
    const socketId = this.findSocketIdByEntityId(data.killerEntityId);
    if (!socketId) {
      // Killer might be an AI or the entity was already removed
      return;
    }

    // Look up the user ID from the session cache
    const userId = this.userSessionCache.getUserIdBySocket(socketId);
    if (!userId) {
      // Player is anonymous - don't track stats
      return;
    }

    // Accumulate the kill count
    const stats = this.getOrCreatePendingStats(userId);
    stats.zombieKills++;
  }

  /**
   * Handle wave completed events
   * Accumulates wave stats for surviving players
   */
  private handleWaveCompleted(data: WaveCompletedEventData): void {
    if (!this.playersMap) {
      return;
    }

    // Award wave completion to all surviving players
    for (const playerEntityId of data.survivingPlayerIds) {
      const socketId = this.findSocketIdByEntityId(playerEntityId);
      if (!socketId) {
        continue;
      }

      const userId = this.userSessionCache.getUserIdBySocket(socketId);
      if (!userId) {
        // Player is anonymous - don't track stats
        continue;
      }

      const stats = this.getOrCreatePendingStats(userId);
      stats.wavesCompleted++;

      // Track max wave reached
      if (data.waveNumber > stats.maxWave) {
        stats.maxWave = data.waveNumber;
      }
    }
  }

  /**
   * Flush all pending stats to the API
   * Handles race conditions and failure recovery
   */
  private async flushPendingStats(): Promise<void> {
    // Skip if already sending or nothing to send
    if (this.isSending || this.pendingStats.size === 0) {
      return;
    }

    // Check if API key is configured
    if (!GAME_SERVER_API_KEY) {
      // Clear pending stats since we can't send them
      this.pendingStats.clear();
      return;
    }

    this.isSending = true;

    // Take a snapshot of current stats and reset the accumulator
    // New stats that come in during sending will go to the fresh map
    const statsToSend = new Map(this.pendingStats);
    this.pendingStats.clear();

    // Send stats for each user
    const failedStats: Map<string, PendingStats> = new Map();

    for (const [userId, stats] of statsToSend) {
      try {
        await this.sendStatsToApi(userId, stats);
      } catch (error) {
        console.error(`Failed to send stats for user ${userId}:`, error);
        // Track failed stats to restore later
        failedStats.set(userId, stats);
      }
    }

    // Restore any failed stats back to the pending map
    // Merge with any new stats that came in during sending
    for (const [userId, failedUserStats] of failedStats) {
      const currentStats = this.pendingStats.get(userId);
      if (currentStats) {
        // Merge: add failed counts to new counts
        currentStats.zombieKills += failedUserStats.zombieKills;
        currentStats.wavesCompleted += failedUserStats.wavesCompleted;
        currentStats.maxWave = Math.max(currentStats.maxWave, failedUserStats.maxWave);
      } else {
        this.pendingStats.set(userId, failedUserStats);
      }
    }

    if (failedStats.size > 0) {
      console.warn(`${failedStats.size} users' stats will be retried in next batch`);
    }

    this.isSending = false;
  }

  /**
   * Find the socket ID for a given player entity ID
   */
  private findSocketIdByEntityId(entityId: number): string | null {
    if (!this.playersMap) {
      return null;
    }

    for (const [socketId, player] of this.playersMap.entries()) {
      if (player.getId() === entityId) {
        return socketId;
      }
    }

    return null;
  }

  /**
   * Send stats to the website API
   */
  private async sendStatsToApi(userId: string, stats: PendingStats): Promise<void> {
    const response = await fetch(`${WEBSITE_API_URL}/api/game/player-stats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": GAME_SERVER_API_KEY,
      },
      body: JSON.stringify({
        userId,
        zombieKills: stats.zombieKills,
        wavesCompleted: stats.wavesCompleted,
        maxWave: stats.maxWave,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API returned ${response.status}: ${error}`);
    }
  }
}
