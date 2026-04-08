import { WEBSITE_API_URL, GAME_SERVER_API_KEY } from "@/config/env";
import { gameEventBus, ZombieKilledEventData } from "./game-event-bus";
import { UserSessionCache } from "./user-session-cache";
import { Player } from "@/entities/players/player";
import { XP_PER_ZOMBIE_KILL } from "@shared/util/experience-level";

const BATCH_INTERVAL_MS = 15000; // Send stats every 15 seconds

interface PendingStats {
  zombieKills: number;
}

/**
 * Stats tracker service that listens for game events (zombie kills)
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

    gameEventBus.onZombieKilled(this.handleZombieKilled.bind(this));

    this.startBatchInterval();

    console.log("KillTracker initialized with 15s batching (kills)");
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
    this.flushPendingStats();
  }

  /**
   * Get or create pending stats for a user
   */
  private getOrCreatePendingStats(userId: string): PendingStats {
    let stats = this.pendingStats.get(userId);
    if (!stats) {
      stats = { zombieKills: 0 };
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

    const killer = this.findPlayerByEntityId(data.killerEntityId);
    if (killer && !killer.serialized.get("isAI")) {
      const cur = killer.serialized.get("experience") ?? 0;
      killer.serialized.set("experience", cur + XP_PER_ZOMBIE_KILL);
    }

    const socketId = this.findSocketIdByEntityId(data.killerEntityId);
    if (!socketId) {
      return;
    }

    const userId = this.userSessionCache.getUserIdBySocket(socketId);
    if (!userId) {
      return;
    }

    const stats = this.getOrCreatePendingStats(userId);
    stats.zombieKills++;

    this.sendExperienceDeltaFireAndForget(userId, XP_PER_ZOMBIE_KILL);
  }

  private findPlayerByEntityId(entityId: number): Player | null {
    if (!this.playersMap) {
      return null;
    }
    for (const player of this.playersMap.values()) {
      if (player.getId() === entityId) {
        return player;
      }
    }
    return null;
  }

  /**
   * Persist experience immediately (per kill); does not block the game loop.
   */
  private sendExperienceDeltaFireAndForget(userId: string, delta: number): void {
    if (!GAME_SERVER_API_KEY || delta <= 0) {
      return;
    }

    void fetch(`${WEBSITE_API_URL}/api/game/add-experience`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": GAME_SERVER_API_KEY,
      },
      body: JSON.stringify({ userId, experienceDelta: delta }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text();
          console.error(
            `add-experience failed for user ${userId}: ${response.status} ${text}`,
          );
        }
      })
      .catch((error) => {
        console.error(`add-experience request failed for user ${userId}:`, error);
      });
  }

  /**
   * Flush all pending stats to the API
   */
  private async flushPendingStats(): Promise<void> {
    if (this.isSending || this.pendingStats.size === 0) {
      return;
    }

    if (!GAME_SERVER_API_KEY) {
      this.pendingStats.clear();
      return;
    }

    this.isSending = true;

    const statsToSend = new Map(this.pendingStats);
    this.pendingStats.clear();

    const failedStats: Map<string, PendingStats> = new Map();

    for (const [userId, stats] of statsToSend) {
      try {
        await this.sendStatsToApi(userId, stats);
      } catch (error) {
        console.error(`Failed to send stats for user ${userId}:`, error);
        failedStats.set(userId, stats);
      }
    }

    for (const [userId, failedUserStats] of failedStats) {
      const currentStats = this.pendingStats.get(userId);
      if (currentStats) {
        currentStats.zombieKills += failedUserStats.zombieKills;
      } else {
        this.pendingStats.set(userId, failedUserStats);
      }
    }

    if (failedStats.size > 0) {
      console.warn(`${failedStats.size} users' stats will be retried in next batch`);
    }

    this.isSending = false;
  }

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
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API returned ${response.status}: ${error}`);
    }
  }
}
