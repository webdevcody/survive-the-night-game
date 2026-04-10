import { IEntity } from "@/entities/types";
import Vector2 from "@shared/util/vector2";
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
    isAttackingMe: boolean;
    recentDamageFromThis: number;
    healthPercent: number;
    isRangedEnemy: boolean;
}
/**
 * Calculates threat priority scores for enemies
 * Used to determine which enemy the AI should focus on
 */
export declare class ThreatScorer {
    /**
     * Calculate threat priority score for an enemy
     * Higher score = should attack this enemy first
     */
    static calculateThreatScore(playerPos: Vector2, enemy: IEntity, damageHistory: DamageHistory, myWeaponRange: number): number;
    /**
     * Create a full ThreatAssessment for an enemy
     */
    static assessThreat(playerPos: Vector2, enemy: IEntity, damageHistory: DamageHistory, myWeaponRange: number): ThreatAssessment | null;
    /**
     * Sort threats by score (highest first)
     */
    static sortByPriority(threats: ThreatAssessment[]): ThreatAssessment[];
    /**
     * Find the most dangerous threat (highest score)
     */
    static findMostDangerous(threats: ThreatAssessment[]): ThreatAssessment | null;
    /**
     * Find the threat that is currently attacking us
     */
    static findCurrentAttacker(threats: ThreatAssessment[]): ThreatAssessment | null;
}
