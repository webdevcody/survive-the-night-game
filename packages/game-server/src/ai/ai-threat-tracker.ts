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
export class ThreatTracker {
  private damageHistory: DamageHistory = {
    records: new Map(),
    totalDamageReceived: 0,
    lastDamageTime: 0,
  };

  // How long to remember attackers (3 seconds)
  private readonly DAMAGE_MEMORY_DURATION = 3000;

  // Time window to consider someone "currently attacking" (500ms)
  private readonly CURRENT_ATTACKER_WINDOW = 500;

  /**
   * Record damage received from an attacker
   */
  recordDamage(
    attackerId: number,
    entityType: "zombie" | "player",
    damage: number
  ): void {
    const now = Date.now();
    const existing = this.damageHistory.records.get(attackerId);

    if (existing) {
      existing.totalDamage += damage;
      existing.lastDamageTime = now;
      existing.hitCount++;
    } else {
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
  hasRecentDamage(withinMs: number = this.CURRENT_ATTACKER_WINDOW): boolean {
    return Date.now() - this.damageHistory.lastDamageTime < withinMs;
  }

  /**
   * Get the entity that dealt the most damage recently
   */
  getMostDangerousAttacker(): DamageRecord | null {
    this.pruneOldRecords();

    let mostDangerous: DamageRecord | null = null;
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
  getMostRecentAttacker(): DamageRecord | null {
    this.pruneOldRecords();

    let mostRecent: DamageRecord | null = null;
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
  isAttackingMe(
    entityId: number,
    withinMs: number = this.CURRENT_ATTACKER_WINDOW
  ): boolean {
    const record = this.damageHistory.records.get(entityId);
    if (!record) return false;
    return Date.now() - record.lastDamageTime < withinMs;
  }

  /**
   * Get the damage record for a specific entity
   */
  getDamageFrom(entityId: number): DamageRecord | null {
    this.pruneOldRecords();
    return this.damageHistory.records.get(entityId) ?? null;
  }

  /**
   * Get all current attackers (entities that hit us recently)
   */
  getCurrentAttackers(): DamageRecord[] {
    this.pruneOldRecords();
    const now = Date.now();
    const attackers: DamageRecord[] = [];

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
  getDamagePercentage(entityId: number): number {
    const record = this.damageHistory.records.get(entityId);
    if (!record || this.damageHistory.totalDamageReceived === 0) return 0;
    return record.totalDamage / this.damageHistory.totalDamageReceived;
  }

  /**
   * Remove damage records older than DAMAGE_MEMORY_DURATION
   */
  private pruneOldRecords(): void {
    const cutoff = Date.now() - this.DAMAGE_MEMORY_DURATION;
    const toRemove: number[] = [];

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
  getDamageHistory(): DamageHistory {
    this.pruneOldRecords();
    return this.damageHistory;
  }

  /**
   * Reset all damage tracking (e.g., when respawning)
   */
  reset(): void {
    this.damageHistory.records.clear();
    this.damageHistory.totalDamageReceived = 0;
    this.damageHistory.lastDamageTime = 0;
  }
}
