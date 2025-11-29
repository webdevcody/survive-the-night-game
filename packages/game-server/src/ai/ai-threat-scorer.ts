import { IEntity } from "@/entities/types";
import Vector2 from "@shared/util/vector2";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import { distance } from "@shared/util/physics";
import { Entities, getZombieTypesSet } from "@shared/constants";
import { AI_CONFIG, THREAT_WEIGHTS } from "./ai-config";
import { DamageHistory } from "./ai-threat-tracker";

/**
 * Assessment of a single threat entity
 */
export interface ThreatAssessment {
  entityId: number;
  entityType: "zombie" | "player";
  entity: IEntity;
  distance: number;
  threatScore: number;

  // Contextual factors
  isAttackingMe: boolean; // Currently damaging us
  recentDamageFromThis: number; // Damage in last 3s
  healthPercent: number; // Enemy's health (if known)
  isRangedEnemy: boolean; // Spitter zombie or player with ranged weapon
}

/**
 * Calculates threat priority scores for enemies
 * Used to determine which enemy the AI should focus on
 */
export class ThreatScorer {
  /**
   * Calculate threat priority score for an enemy
   * Higher score = should attack this enemy first
   */
  static calculateThreatScore(
    playerPos: Vector2,
    enemy: IEntity,
    damageHistory: DamageHistory,
    myWeaponRange: number
  ): number {
    let score = 0;

    if (!enemy.hasExt(Positionable)) return 0;

    const enemyPos = enemy.getExt(Positionable).getCenterPosition();
    const dist = distance(playerPos, enemyPos);

    // =====================
    // DISTANCE SCORING
    // =====================
    if (dist <= AI_CONFIG.IMMEDIATE_THREAT_RADIUS) {
      score += THREAT_WEIGHTS.IMMEDIATE_RANGE;
    } else if (dist <= 150) {
      score += THREAT_WEIGHTS.CLOSE_RANGE;
    } else if (dist <= AI_CONFIG.COMBAT_ENGAGE_RADIUS) {
      score += THREAT_WEIGHTS.MEDIUM_RANGE;
    } else if (dist > myWeaponRange) {
      score += THREAT_WEIGHTS.FAR_AWAY_PENALTY;
    }

    // =====================
    // DAMAGE-BASED SCORING (KEY FIX FOR MAIN BUG)
    // =====================
    const damageRecord = damageHistory.records.get(enemy.getId());
    if (damageRecord) {
      const timeSinceDamage = Date.now() - damageRecord.lastDamageTime;

      // HIGHEST PRIORITY: Currently attacking me (hit in last 0.5s)
      if (timeSinceDamage < AI_CONFIG.CURRENT_ATTACKER_WINDOW) {
        score += THREAT_WEIGHTS.CURRENTLY_ATTACKING;
      } else if (timeSinceDamage < 2000) {
        // Recent damage (hit in last 2s)
        score += THREAT_WEIGHTS.RECENT_DAMAGE;
      }

      // High damage source bonus (dealt >30% of my total recent damage)
      if (damageHistory.totalDamageReceived > 0) {
        const damagePercent =
          damageRecord.totalDamage / damageHistory.totalDamageReceived;
        if (damagePercent > 0.3) {
          score += THREAT_WEIGHTS.HIGH_DAMAGE_SOURCE;
        }
      }
    }

    // =====================
    // ENEMY TYPE SCORING
    // =====================
    const zombieTypes = getZombieTypesSet();
    const entityType = enemy.getType();
    const isZombie = zombieTypes.has(entityType as any);
    const isPlayer = entityType === Entities.PLAYER;

    // Players get a small bonus (reduced from old +50px bias)
    if (isPlayer) {
      score += THREAT_WEIGHTS.PLAYER_BONUS;
    }

    // Ranged enemies are more dangerous
    const isRangedEnemy = entityType === Entities.SPITTER_ZOMBIE;
    if (isRangedEnemy) {
      score += THREAT_WEIGHTS.RANGED_THREAT;
    }

    // =====================
    // TACTICAL SCORING
    // =====================
    // Low health enemy = opportunity for easy kill
    if (enemy.hasExt(Destructible)) {
      const destructible = enemy.getExt(Destructible);
      const healthPercent = destructible.getHealth() / destructible.getMaxHealth();
      if (healthPercent < 0.3) {
        score += THREAT_WEIGHTS.LOW_HEALTH_ENEMY;
      }
    }

    return score;
  }

  /**
   * Create a full ThreatAssessment for an enemy
   */
  static assessThreat(
    playerPos: Vector2,
    enemy: IEntity,
    damageHistory: DamageHistory,
    myWeaponRange: number
  ): ThreatAssessment | null {
    if (!enemy.hasExt(Positionable)) return null;

    const zombieTypes = getZombieTypesSet();
    const entityType = enemy.getType();
    const isZombie = zombieTypes.has(entityType as any);
    const isPlayer = entityType === Entities.PLAYER;

    // Only assess zombies and players
    if (!isZombie && !isPlayer) return null;

    // Skip dead entities
    if (enemy.hasExt(Destructible) && enemy.getExt(Destructible).isDead()) {
      return null;
    }

    const enemyPos = enemy.getExt(Positionable).getCenterPosition();
    const dist = distance(playerPos, enemyPos);
    const score = this.calculateThreatScore(
      playerPos,
      enemy,
      damageHistory,
      myWeaponRange
    );

    const damageRecord = damageHistory.records.get(enemy.getId());
    const isAttackingMe = damageRecord
      ? Date.now() - damageRecord.lastDamageTime < AI_CONFIG.CURRENT_ATTACKER_WINDOW
      : false;

    let healthPercent = 1;
    if (enemy.hasExt(Destructible)) {
      const d = enemy.getExt(Destructible);
      healthPercent = d.getHealth() / d.getMaxHealth();
    }

    const isRangedEnemy = entityType === Entities.SPITTER_ZOMBIE;

    return {
      entityId: enemy.getId(),
      entityType: isZombie ? "zombie" : "player",
      entity: enemy,
      distance: dist,
      threatScore: score,
      isAttackingMe,
      recentDamageFromThis: damageRecord?.totalDamage ?? 0,
      healthPercent,
      isRangedEnemy,
    };
  }

  /**
   * Sort threats by score (highest first)
   */
  static sortByPriority(threats: ThreatAssessment[]): ThreatAssessment[] {
    return threats.sort((a, b) => b.threatScore - a.threatScore);
  }

  /**
   * Find the most dangerous threat (highest score)
   */
  static findMostDangerous(
    threats: ThreatAssessment[]
  ): ThreatAssessment | null {
    if (threats.length === 0) return null;
    return this.sortByPriority(threats)[0];
  }

  /**
   * Find the threat that is currently attacking us
   */
  static findCurrentAttacker(
    threats: ThreatAssessment[]
  ): ThreatAssessment | null {
    return threats.find((t) => t.isAttackingMe) ?? null;
  }
}
