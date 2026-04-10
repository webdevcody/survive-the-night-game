import { Player } from "@/entities/players/player";
import { EnhancedThreatInfo } from "./ai-targeting";
import { ThreatAssessment } from "./ai-threat-scorer";
import { SupplyStatus } from "./ai-readiness";
import { AIState } from "./ai-state-machine";
/**
 * Decision types the AI can make
 */
export declare enum AIDecision {
    ESCAPE = "ESCAPE",// Very low health - flee completely, no fighting
    ENGAGE_ATTACKER = "ENGAGE_ATTACKER",// Fight the entity attacking us (highest priority)
    ENGAGE_THREAT = "ENGAGE_THREAT",// Fight the highest scored threat
    FINISH_KILL = "FINISH_KILL",// Finish off low HP enemy before retreating
    RETREAT_AND_FIGHT = "RETREAT_AND_FIGHT",// Kite backward while fighting (surrounded)
    RETREAT = "RETREAT",// Pure retreat to heal
    DISENGAGE = "DISENGAGE",// Break off combat to gather supplies
    HUNT = "HUNT",// Search for players
    LOOT = "LOOT",// Collect items
    EXPLORE = "EXPLORE"
}
/**
 * Result of the decision engine
 */
export interface DecisionResult {
    decision: AIDecision;
    targetThreat: ThreatAssessment | null;
    reason: string;
    shouldForceRetarget: boolean;
}
/**
 * AI Decision Engine - Makes high-level combat decisions based on threat assessment
 *
 * NEW Priority Order (with hysteresis and readiness):
 * 0. RETREAT PERSISTENCE / ALL-IN - Stay in retreat until healed, or go all-in
 * 1. ESCAPE (< 30% HP + enemies) - Very low HP, flee completely
 * 2. CRITICAL HEALTH (< 25% HP + bandage) - Force retreat
 * 3. BEING ATTACKED - Fight back (defensive during retreat, full engage otherwise)
 * 4. IMMEDIATE THREAT (< 80px) - Must engage or escape based on readiness
 * 5. NEARBY ENEMY (< 200px) - Engage if ready, retreat if not
 * 6. LOW HEALTH (< 50%) - Enter retreat
 * 7. HUNT (readiness >= 40) - Has weapon + ammo
 * 8. LOOT (readiness < 40) - Need supplies
 * 9. EXPLORE - Default
 */
export declare class AIDecisionEngine {
    /**
     * Enhanced decision making with readiness-based approach and hysteresis
     */
    static makeEnhancedDecision(player: Player, threatInfo: EnhancedThreatInfo, supplyStatus: SupplyStatus, currentState: AIState, stateTimer: number, isAllInMode: boolean, hasLootTarget: boolean): DecisionResult;
    /**
     * Legacy decision making (for backwards compatibility)
     * @deprecated Use makeEnhancedDecision instead
     */
    static makeDecision(player: Player, threatInfo: EnhancedThreatInfo, hasHealing: boolean, hasWeapon: boolean, hasLootTarget: boolean): DecisionResult;
    /**
     * Find an enemy that's currently attacking us (hit in last 500ms)
     */
    private static findCurrentAttacker;
    /**
     * Find an enemy that's low HP enough to finish off
     * Only returns if:
     * - Enemy is below FINISH_KILL_ENEMY_HP (15%)
     * - We're above FINISH_KILL_MY_HP (30%)
     * - Enemy is within engagement range
     */
    private static findFinishableEnemy;
    /**
     * Check if we should force an immediate retarget
     * Called when we take damage
     */
    static shouldForceRetarget(currentTargetId: number | null, attackerId: number): boolean;
    /**
     * Get the appropriate retarget interval based on combat state
     */
    static getRetargetInterval(isInCombat: boolean): number;
}
