import { Player } from "@/entities/players/player";
import { InventoryItem } from "@shared/util/inventory";
import { EnhancedThreatInfo } from "./ai-targeting";
import { DecisionResult } from "./ai-decision-engine";
/**
 * AI behavior states - simplified for clarity
 */
export declare enum AIState {
    ENGAGE = "ENGAGE",// Active combat with any enemy (zombie or player)
    RETREAT = "RETREAT",// Fleeing and healing
    LOOT = "LOOT",// Collecting items
    HUNT = "HUNT",// Actively searching for players
    EXPLORE = "EXPLORE",// Wandering when nothing else to do
    FLEE = "FLEE"
}
/**
 * Kiting phase for melee combat
 */
export declare enum KitePhase {
    APPROACH = "APPROACH",
    ATTACK = "ATTACK",
    RETREAT = "RETREAT",
    DISENGAGE = "DISENGAGE"
}
/**
 * Information about current threats
 */
export interface ThreatInfo {
    hasImmediateThreat: boolean;
    hasNearbyEnemy: boolean;
    nearestEnemyDistance: number;
    enemyType: "zombie" | "player" | "none";
}
/**
 * AI State Machine - Priority-based state selection
 *
 * Priority Order (highest to lowest):
 * 1. CRITICAL HEALTH + has healing → RETREAT (survival)
 * 2. IMMEDIATE THREAT → ENGAGE (must fight or die)
 * 3. NEARBY ENEMY + has weapon → ENGAGE
 * 4. LOW HEALTH + has healing → RETREAT
 * 5. Has good equipment → HUNT for players
 * 6. Loot available → LOOT
 * 7. Default → EXPLORE
 */
export declare class AIStateMachine {
    private currentState;
    private kitePhase;
    private kiteTimer;
    private stateTimer;
    private kiteCycleCount;
    private disengageTimer;
    private isDisengaging;
    private escapeTimer;
    private isEscaping;
    private retreatCommitted;
    private allInMode;
    getCurrentState(): AIState;
    getKitePhase(): KitePhase;
    setKitePhase(phase: KitePhase): void;
    getKiteTimer(): number;
    updateKiteTimer(deltaTime: number): void;
    getStateTimer(): number;
    getKiteCycleCount(): number;
    /**
     * Check if AI should disengage from combat to go gather supplies
     */
    shouldDisengage(): boolean;
    /**
     * Start disengaging from combat
     */
    startDisengage(): void;
    /**
     * Check if disengage period is over
     */
    isDisengageComplete(): boolean;
    /**
     * Reset disengage state (when re-entering combat or finding loot)
     */
    resetDisengage(): void;
    /**
     * Check if AI is disengaging
     */
    getIsDisengaging(): boolean;
    /**
     * Start escape mode (very low health)
     */
    startEscape(): void;
    /**
     * Check if escape period is over
     */
    isEscapeComplete(): boolean;
    /**
     * Reset escape state
     */
    resetEscape(): void;
    /**
     * Check if AI is escaping
     */
    getIsEscaping(): boolean;
    /**
     * Reset kite cycle count (when starting fresh combat)
     */
    resetKiteCycles(): void;
    /**
     * Transition to a new state with duration enforcement
     * Returns true if transition was successful, false if blocked
     */
    private transitionTo;
    /**
     * Force transition to a state (bypasses duration checks)
     * Use sparingly - mainly for critical situations
     */
    forceTransitionTo(newState: AIState): void;
    /**
     * Main update - determines state based on priority
     */
    update(player: Player, threatInfo: ThreatInfo, hasLootTarget: boolean, deltaTime: number): void;
    /**
     * Force transition to RETREAT (called externally when health drops during combat)
     */
    forceRetreat(): void;
    /**
     * Enhanced update using the new decision engine
     * This is the KEY FIX for proper threat prioritization
     */
    updateWithDecisionEngine(player: Player, enhancedThreatInfo: EnhancedThreatInfo, hasLootTarget: boolean, deltaTime: number): DecisionResult;
    /**
     * Map a decision to the appropriate state
     */
    private decisionToState;
    /**
     * Check if we should be kiting (retreating while fighting)
     */
    shouldKiteRetreat(decision: DecisionResult): boolean;
    /**
     * Check if we should be escaping (very low health)
     */
    shouldEscape(decision: DecisionResult): boolean;
    /**
     * Check if recovered enough to leave retreat (legacy - use canExitRetreat instead)
     */
    shouldExitRetreat(player: Player): boolean;
    /**
     * Check if AI can exit retreat state with hysteresis
     * Must meet BOTH conditions:
     * 1. Health has recovered to exit threshold (80%)
     * 2. Minimum retreat duration has passed (10 seconds)
     *
     * If 10 seconds pass without healing to 80%, triggers "all-in" mode
     */
    canExitRetreat(healthPercent: number): boolean;
    /**
     * Check if AI is in "all-in" mode (retreat timer expired without healing)
     * In this mode, AI should fight aggressively regardless of health
     */
    isAllInMode(): boolean;
    /**
     * Reset all-in mode (called when threat is eliminated or AI heals)
     */
    resetAllInMode(): void;
    /**
     * Check if retreat is committed (for external queries)
     */
    isRetreatCommitted(): boolean;
    /**
     * Check if AI can exit current state to transition to target state
     * Enforces minimum state durations
     */
    canExitCurrentState(targetState: AIState): boolean;
    /**
     * Get minimum duration for a state
     */
    getMinDurationForState(state: AIState): number;
    /**
     * Check if target state can interrupt current state before minimum duration
     * - FLEE can interrupt ANY state (toxic zone emergency)
     * - RETREAT cannot be interrupted by anything except FLEE
     * - ENGAGE can only be interrupted by RETREAT or FLEE
     * - Other states can be interrupted by ENGAGE, RETREAT, or FLEE
     */
    private canInterrupt;
    hasAnyWeapon(inventory: InventoryItem[]): boolean;
    hasGoodWeapon(inventory: InventoryItem[]): boolean;
    hasBandage(inventory: InventoryItem[]): boolean;
    hasAmmoForWeapons(inventory: InventoryItem[]): boolean;
    hasRangedWeaponWithAmmo(inventory: InventoryItem[]): boolean;
    /**
     * Check if AI is ready to hunt - requires:
     * - Pistol with at least 5 ammo, OR
     * - Any good ranged weapon (shotgun, ak47, bolt action) with at least 1 ammo
     */
    isReadyToHunt(inventory: InventoryItem[]): boolean;
    /**
     * Get the index of best weapon to use
     * Returns 1-based index for selectInventoryItem
     */
    getBestWeaponIndex(inventory: InventoryItem[]): number;
    /**
     * Get knife index specifically
     */
    getKnifeIndex(inventory: InventoryItem[]): number;
    /**
     * Get inventory index of best healable consumable (prefers bandage over weaker items)
     */
    getBandageIndex(inventory: InventoryItem[]): number;
}
