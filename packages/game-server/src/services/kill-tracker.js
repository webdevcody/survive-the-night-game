import { GAME_SERVER_API_KEY, WEBSITE_API_URL } from "@/config/env";
import { queuePersistExperienceDeltaToWebsite } from "@/util/persist-experience-delta";
import { gameEventBus } from "./game-event-bus";
import { recordKillQuestProgress } from "@/quests/quest-runtime";
import { UserSessionCache } from "./user-session-cache";
import { XP_PER_ZOMBIE_KILL } from "@shared/util/experience-level";
const BATCH_INTERVAL_MS = 15000; // Send stats every 15 seconds
/**
 * Stats tracker service that listens for game events (zombie kills)
 * and batches them to send to the website API periodically.
 *
 * Batching reduces HTTP requests from potentially hundreds per second
 * to one request every 15 seconds per active user.
 */
export class KillTracker {
    static getInstance() {
        if (!KillTracker.instance) {
            KillTracker.instance = new KillTracker();
        }
        return KillTracker.instance;
    }
    constructor() {
        this.playersMap = null;
        this.isInitialized = false;
        // Accumulates stats per user until the next batch send
        this.pendingStats = new Map();
        this.batchInterval = null;
        this.isSending = false;
        this.userSessionCache = UserSessionCache.getInstance();
    }
    /**
     * Initialize the stats tracker with access to the players map
     * This allows us to look up socket IDs from player entity IDs
     */
    initialize(playersMap) {
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
    startBatchInterval() {
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
    shutdown() {
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
            this.batchInterval = null;
        }
        this.flushPendingStats();
    }
    /**
     * Get or create pending stats for a user
     */
    getOrCreatePendingStats(userId) {
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
    handleZombieKilled(data) {
        var _a, _b;
        if (!this.playersMap) {
            return;
        }
        const killer = this.findPlayerByEntityId(data.killerEntityId);
        if (killer && !killer.getSerialized().get("isAI")) {
            const cur = (_a = killer.getSerialized().get("experience")) !== null && _a !== void 0 ? _a : 0;
            killer.getSerialized().set("experience", cur + XP_PER_ZOMBIE_KILL);
            const map = (_b = killer.getGameManagers()) === null || _b === void 0 ? void 0 : _b.getMapManager();
            if (map) {
                recordKillQuestProgress(killer, data.enemyType, map);
            }
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
        queuePersistExperienceDeltaToWebsite(userId, XP_PER_ZOMBIE_KILL);
    }
    findPlayerByEntityId(entityId) {
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
     * Flush all pending stats to the API
     */
    async flushPendingStats() {
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
        const failedStats = new Map();
        for (const [userId, stats] of statsToSend) {
            try {
                await this.sendStatsToApi(userId, stats);
            }
            catch (error) {
                console.error(`Failed to send stats for user ${userId}:`, error);
                failedStats.set(userId, stats);
            }
        }
        for (const [userId, failedUserStats] of failedStats) {
            const currentStats = this.pendingStats.get(userId);
            if (currentStats) {
                currentStats.zombieKills += failedUserStats.zombieKills;
            }
            else {
                this.pendingStats.set(userId, failedUserStats);
            }
        }
        if (failedStats.size > 0) {
            console.warn(`${failedStats.size} users' stats will be retried in next batch`);
        }
        this.isSending = false;
    }
    findSocketIdByEntityId(entityId) {
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
    async sendStatsToApi(userId, stats) {
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
