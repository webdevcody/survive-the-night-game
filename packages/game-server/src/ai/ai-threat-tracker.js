/**
 * Tracks damage received by an AI player to identify attackers
 * and prioritize threats based on who's actually hurting us
 */
export class ThreatTracker {
    constructor() {
        this.damageHistory = {
            records: new Map(),
            totalDamageReceived: 0,
            lastDamageTime: 0,
        };
        // How long to remember attackers (3 seconds)
        this.DAMAGE_MEMORY_DURATION = 3000;
        // Time window to consider someone "currently attacking" (500ms)
        this.CURRENT_ATTACKER_WINDOW = 500;
    }
    /**
     * Record damage received from an attacker
     */
    recordDamage(attackerId, entityType, damage) {
        const now = Date.now();
        const existing = this.damageHistory.records.get(attackerId);
        if (existing) {
            existing.totalDamage += damage;
            existing.lastDamageTime = now;
            existing.hitCount++;
        }
        else {
            this.damageHistory.records.set(attackerId, {
                attackerId,
                entityType,
                totalDamage: damage,
                lastDamageTime: now,
                hitCount: 1,
            });
        }
        this.damageHistory.totalDamageReceived += damage;
        this.damageHistory.lastDamageTime = now;
    }
    /**
     * Check if we received damage within the specified time window
     */
    hasRecentDamage(withinMs = this.CURRENT_ATTACKER_WINDOW) {
        return Date.now() - this.damageHistory.lastDamageTime < withinMs;
    }
    /**
     * Get the entity that dealt the most damage recently
     */
    getMostDangerousAttacker() {
        this.pruneOldRecords();
        let mostDangerous = null;
        let highestDamage = 0;
        for (const record of this.damageHistory.records.values()) {
            if (record.totalDamage > highestDamage) {
                highestDamage = record.totalDamage;
                mostDangerous = record;
            }
        }
        return mostDangerous;
    }
    /**
     * Get the most recent attacker (regardless of total damage)
     */
    getMostRecentAttacker() {
        this.pruneOldRecords();
        let mostRecent = null;
        let latestTime = 0;
        for (const record of this.damageHistory.records.values()) {
            if (record.lastDamageTime > latestTime) {
                latestTime = record.lastDamageTime;
                mostRecent = record;
            }
        }
        return mostRecent;
    }
    /**
     * Check if a specific entity attacked us recently
     */
    isAttackingMe(entityId, withinMs = this.CURRENT_ATTACKER_WINDOW) {
        const record = this.damageHistory.records.get(entityId);
        if (!record)
            return false;
        return Date.now() - record.lastDamageTime < withinMs;
    }
    /**
     * Get the damage record for a specific entity
     */
    getDamageFrom(entityId) {
        var _a;
        this.pruneOldRecords();
        return (_a = this.damageHistory.records.get(entityId)) !== null && _a !== void 0 ? _a : null;
    }
    /**
     * Get all current attackers (entities that hit us recently)
     */
    getCurrentAttackers() {
        this.pruneOldRecords();
        const now = Date.now();
        const attackers = [];
        for (const record of this.damageHistory.records.values()) {
            if (now - record.lastDamageTime < this.CURRENT_ATTACKER_WINDOW) {
                attackers.push(record);
            }
        }
        return attackers;
    }
    /**
     * Get the percentage of total damage from a specific attacker
     */
    getDamagePercentage(entityId) {
        const record = this.damageHistory.records.get(entityId);
        if (!record || this.damageHistory.totalDamageReceived === 0)
            return 0;
        return record.totalDamage / this.damageHistory.totalDamageReceived;
    }
    /**
     * Remove damage records older than DAMAGE_MEMORY_DURATION
     */
    pruneOldRecords() {
        const cutoff = Date.now() - this.DAMAGE_MEMORY_DURATION;
        const toRemove = [];
        for (const [id, record] of this.damageHistory.records) {
            if (record.lastDamageTime < cutoff) {
                toRemove.push(id);
                this.damageHistory.totalDamageReceived -= record.totalDamage;
            }
        }
        for (const id of toRemove) {
            this.damageHistory.records.delete(id);
        }
        // Ensure total doesn't go negative due to float errors
        if (this.damageHistory.totalDamageReceived < 0) {
            this.damageHistory.totalDamageReceived = 0;
        }
    }
    /**
     * Get the full damage history (for decision engine)
     */
    getDamageHistory() {
        this.pruneOldRecords();
        return this.damageHistory;
    }
    /**
     * Reset all damage tracking (e.g., when respawning)
     */
    reset() {
        this.damageHistory.records.clear();
        this.damageHistory.totalDamageReceived = 0;
        this.damageHistory.lastDamageTime = 0;
    }
}
