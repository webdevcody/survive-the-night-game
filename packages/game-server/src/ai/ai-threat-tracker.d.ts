/**
 * Damage record from a single attacker
 */
export interface DamageRecord {
    attackerId: number;
    entityType: "zombie" | "player";
    totalDamage: number;
    lastDamageTime: number;
    hitCount: number;
}
/**
 * Complete damage history for an AI player
 */
export interface DamageHistory {
    records: Map<number, DamageRecord>;
    totalDamageReceived: number;
    lastDamageTime: number;
}
/**
 * Tracks damage received by an AI player to identify attackers
 * and prioritize threats based on who's actually hurting us
 */
export declare class ThreatTracker {
    private damageHistory;
    private readonly DAMAGE_MEMORY_DURATION;
    private readonly CURRENT_ATTACKER_WINDOW;
    /**
     * Record damage received from an attacker
     */
    recordDamage(attackerId: number, entityType: "zombie" | "player", damage: number): void;
    /**
     * Check if we received damage within the specified time window
     */
    hasRecentDamage(withinMs?: number): boolean;
    /**
     * Get the entity that dealt the most damage recently
     */
    getMostDangerousAttacker(): DamageRecord | null;
    /**
     * Get the most recent attacker (regardless of total damage)
     */
    getMostRecentAttacker(): DamageRecord | null;
    /**
     * Check if a specific entity attacked us recently
     */
    isAttackingMe(entityId: number, withinMs?: number): boolean;
    /**
     * Get the damage record for a specific entity
     */
    getDamageFrom(entityId: number): DamageRecord | null;
    /**
     * Get all current attackers (entities that hit us recently)
     */
    getCurrentAttackers(): DamageRecord[];
    /**
     * Get the percentage of total damage from a specific attacker
     */
    getDamagePercentage(entityId: number): number;
    /**
     * Remove damage records older than DAMAGE_MEMORY_DURATION
     */
    private pruneOldRecords;
    /**
     * Get the full damage history (for decision engine)
     */
    getDamageHistory(): DamageHistory;
    /**
     * Reset all damage tracking (e.g., when respawning)
     */
    reset(): void;
}
