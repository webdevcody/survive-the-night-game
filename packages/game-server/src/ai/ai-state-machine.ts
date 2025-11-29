import { Player } from "@/entities/players/player";
import { InventoryItem } from "@shared/util/inventory";
import { AI_CONFIG, GOOD_WEAPONS, WEAPON_AMMO_MAP, MELEE_WEAPONS } from "./ai-config";
import { EnhancedThreatInfo } from "./ai-targeting";
import { AIDecisionEngine, AIDecision, DecisionResult } from "./ai-decision-engine";

/**
 * AI behavior states - simplified for clarity
 */
export enum AIState {
  ENGAGE = "ENGAGE", // Active combat with any enemy (zombie or player)
  RETREAT = "RETREAT", // Fleeing and healing
  LOOT = "LOOT", // Collecting items
  HUNT = "HUNT", // Actively searching for players
  EXPLORE = "EXPLORE", // Wandering when nothing else to do
  FLEE = "FLEE", // Emergency flee from toxic zone - highest priority
}

/**
 * Kiting phase for melee combat
 */
export enum KitePhase {
  APPROACH = "APPROACH",
  ATTACK = "ATTACK",
  RETREAT = "RETREAT",
  DISENGAGE = "DISENGAGE", // Breaking off combat to go gather supplies
}

/**
 * Information about current threats
 */
export interface ThreatInfo {
  hasImmediateThreat: boolean; // Enemy within IMMEDIATE_THREAT_RADIUS
  hasNearbyEnemy: boolean; // Enemy within COMBAT_ENGAGE_RADIUS
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
export class AIStateMachine {
  private currentState: AIState = AIState.LOOT;
  private kitePhase: KitePhase = KitePhase.APPROACH;
  private kiteTimer: number = 0;
  private stateTimer: number = 0; // How long we've been in current state

  // Kite cycle tracking for disengage behavior
  private kiteCycleCount: number = 0;
  private disengageTimer: number = 0;
  private isDisengaging: boolean = false;

  // Escape behavior for very low health
  private escapeTimer: number = 0;
  private isEscaping: boolean = false;

  // Hysteresis tracking for retreat state
  private retreatCommitted: boolean = false; // True when we've entered retreat
  private allInMode: boolean = false; // True when retreat timer expired without healing

  getCurrentState(): AIState {
    return this.currentState;
  }

  getKitePhase(): KitePhase {
    return this.kitePhase;
  }

  setKitePhase(phase: KitePhase): void {
    if (this.kitePhase !== phase) {
      this.kitePhase = phase;
      this.kiteTimer = 0;

      // Track when we complete a full kite cycle (attack -> retreat -> approach)
      if (phase === KitePhase.APPROACH && this.kiteCycleCount < AI_CONFIG.MAX_KITE_CYCLES) {
        this.kiteCycleCount++;
      }
    }
  }

  getKiteTimer(): number {
    return this.kiteTimer;
  }

  updateKiteTimer(deltaTime: number): void {
    this.kiteTimer += deltaTime;

    // Update disengage timer if disengaging
    if (this.isDisengaging) {
      this.disengageTimer += deltaTime;
    }

    // Update escape timer if escaping
    if (this.isEscaping) {
      this.escapeTimer += deltaTime;
    }
  }

  getStateTimer(): number {
    return this.stateTimer;
  }

  getKiteCycleCount(): number {
    return this.kiteCycleCount;
  }

  /**
   * Check if AI should disengage from combat to go gather supplies
   */
  shouldDisengage(): boolean {
    // Already disengaging
    if (this.isDisengaging) {
      return true;
    }

    // If we've done max cycles, definitely disengage
    if (this.kiteCycleCount >= AI_CONFIG.MAX_KITE_CYCLES) {
      return true;
    }

    // After min cycles, random chance to disengage
    if (this.kiteCycleCount >= AI_CONFIG.MIN_KITE_CYCLES) {
      return Math.random() < AI_CONFIG.DISENGAGE_CHANCE;
    }

    return false;
  }

  /**
   * Start disengaging from combat
   */
  startDisengage(): void {
    this.isDisengaging = true;
    this.disengageTimer = 0;
    this.kitePhase = KitePhase.DISENGAGE;
  }

  /**
   * Check if disengage period is over
   */
  isDisengageComplete(): boolean {
    // Disengage for ~2-3 seconds before reconsidering combat
    return this.disengageTimer >= 2.5;
  }

  /**
   * Reset disengage state (when re-entering combat or finding loot)
   */
  resetDisengage(): void {
    this.isDisengaging = false;
    this.disengageTimer = 0;
    this.kiteCycleCount = 0;
  }

  /**
   * Check if AI is disengaging
   */
  getIsDisengaging(): boolean {
    return this.isDisengaging;
  }

  /**
   * Start escape mode (very low health)
   */
  startEscape(): void {
    this.isEscaping = true;
    this.escapeTimer = 0;
  }

  /**
   * Check if escape period is over
   */
  isEscapeComplete(): boolean {
    return this.escapeTimer >= AI_CONFIG.ESCAPE_DURATION;
  }

  /**
   * Reset escape state
   */
  resetEscape(): void {
    this.isEscaping = false;
    this.escapeTimer = 0;
  }

  /**
   * Check if AI is escaping
   */
  getIsEscaping(): boolean {
    return this.isEscaping;
  }

  /**
   * Reset kite cycle count (when starting fresh combat)
   */
  resetKiteCycles(): void {
    this.kiteCycleCount = 0;
  }

  /**
   * Transition to a new state with duration enforcement
   * Returns true if transition was successful, false if blocked
   */
  private transitionTo(newState: AIState, force: boolean = false): boolean {
    // Same state - no transition needed
    if (this.currentState === newState) {
      return true;
    }

    // Check if we can exit current state (unless forced)
    if (!force && !this.canExitCurrentState(newState)) {
      return false;
    }

    // Track leaving retreat state
    if (this.currentState === AIState.RETREAT) {
      this.retreatCommitted = false;
    }

    // Perform transition
    this.currentState = newState;
    this.stateTimer = 0;

    // Track entering retreat state
    if (newState === AIState.RETREAT) {
      this.retreatCommitted = true;
      this.allInMode = false; // Reset all-in when entering fresh retreat
    }

    // Reset kiting when entering engage state
    if (newState === AIState.ENGAGE) {
      this.kitePhase = KitePhase.APPROACH;
      this.kiteTimer = 0;
    }

    return true;
  }

  /**
   * Force transition to a state (bypasses duration checks)
   * Use sparingly - mainly for critical situations
   */
  forceTransitionTo(newState: AIState): void {
    this.transitionTo(newState, true);
  }

  /**
   * Main update - determines state based on priority
   */
  update(
    player: Player,
    threatInfo: ThreatInfo,
    hasLootTarget: boolean,
    deltaTime: number
  ): void {
    this.stateTimer += deltaTime;

    const healthPercent = player.getHealth() / player.getMaxHealth();
    const inventory = player.getInventory();
    const hasHealing = this.hasBandage(inventory);
    const hasAnyWeapon = this.hasAnyWeapon(inventory);
    const hasGoodWeapon = this.hasGoodWeapon(inventory);
    const hasAmmo = this.hasAmmoForWeapons(inventory);

    // Priority 1: CRITICAL HEALTH - must retreat to survive
    if (healthPercent < AI_CONFIG.CRITICAL_HEALTH_THRESHOLD && hasHealing) {
      this.transitionTo(AIState.RETREAT);
      return;
    }

    // Priority 2: IMMEDIATE THREAT - enemy right on top of us, must fight
    if (threatInfo.hasImmediateThreat) {
      this.transitionTo(AIState.ENGAGE);
      return;
    }

    // Priority 3: NEARBY ENEMY with weapon - engage them
    if (threatInfo.hasNearbyEnemy && hasAnyWeapon) {
      this.transitionTo(AIState.ENGAGE);
      return;
    }

    // Priority 4: LOW HEALTH - retreat if we can heal and not in immediate danger
    if (healthPercent < AI_CONFIG.RETREAT_HEALTH_THRESHOLD && hasHealing) {
      this.transitionTo(AIState.RETREAT);
      return;
    }

    // Priority 5: Well equipped - hunt for players
    // Requires: pistol+5 ammo OR good ranged weapon with ammo
    if (this.isReadyToHunt(inventory)) {
      this.transitionTo(AIState.HUNT);
      return;
    }

    // Priority 7: Loot available - go get it
    if (hasLootTarget) {
      this.transitionTo(AIState.LOOT);
      return;
    }

    // Priority 8: Default - explore to find something
    this.transitionTo(AIState.EXPLORE);
  }

  /**
   * Force transition to RETREAT (called externally when health drops during combat)
   */
  forceRetreat(): void {
    this.transitionTo(AIState.RETREAT);
  }

  /**
   * Enhanced update using the new decision engine
   * This is the KEY FIX for proper threat prioritization
   */
  updateWithDecisionEngine(
    player: Player,
    enhancedThreatInfo: EnhancedThreatInfo,
    hasLootTarget: boolean,
    deltaTime: number
  ): DecisionResult {
    this.stateTimer += deltaTime;

    const inventory = player.getInventory();
    const hasHealing = this.hasBandage(inventory);
    const hasWeapon = this.hasAnyWeapon(inventory);

    // Use the decision engine to determine what to do
    const decision = AIDecisionEngine.makeDecision(
      player,
      enhancedThreatInfo,
      hasHealing,
      hasWeapon,
      hasLootTarget
    );

    // Map decision to state
    const newState = this.decisionToState(decision.decision);
    this.transitionTo(newState);

    return decision;
  }

  /**
   * Map a decision to the appropriate state
   */
  private decisionToState(decision: AIDecision): AIState {
    switch (decision) {
      case AIDecision.ESCAPE:
        // Fleeing completely - go to retreat state
        return AIState.RETREAT;

      case AIDecision.ENGAGE_ATTACKER:
      case AIDecision.ENGAGE_THREAT:
      case AIDecision.FINISH_KILL:
        return AIState.ENGAGE;

      case AIDecision.RETREAT_AND_FIGHT:
        // Special case: still ENGAGE but with kiting behavior
        return AIState.ENGAGE;

      case AIDecision.DISENGAGE:
        // Breaking off combat to gather supplies
        return AIState.LOOT;

      case AIDecision.RETREAT:
        return AIState.RETREAT;

      case AIDecision.HUNT:
        return AIState.HUNT;

      case AIDecision.LOOT:
        return AIState.LOOT;

      case AIDecision.EXPLORE:
      default:
        return AIState.EXPLORE;
    }
  }

  /**
   * Check if we should be kiting (retreating while fighting)
   */
  shouldKiteRetreat(decision: DecisionResult): boolean {
    return decision.decision === AIDecision.RETREAT_AND_FIGHT;
  }

  /**
   * Check if we should be escaping (very low health)
   */
  shouldEscape(decision: DecisionResult): boolean {
    return decision.decision === AIDecision.ESCAPE;
  }

  /**
   * Check if recovered enough to leave retreat (legacy - use canExitRetreat instead)
   */
  shouldExitRetreat(player: Player): boolean {
    const healthPercent = player.getHealth() / player.getMaxHealth();
    return healthPercent >= AI_CONFIG.RECOVER_HEALTH_THRESHOLD;
  }

  /**
   * Check if AI can exit retreat state with hysteresis
   * Must meet BOTH conditions:
   * 1. Health has recovered to exit threshold (80%)
   * 2. Minimum retreat duration has passed (10 seconds)
   *
   * If 10 seconds pass without healing to 80%, triggers "all-in" mode
   */
  canExitRetreat(healthPercent: number): boolean {
    // Not in retreat? Can always "exit"
    if (!this.retreatCommitted) {
      return true;
    }

    const minDurationMet = this.stateTimer >= AI_CONFIG.STATE_MIN_DURATION_RETREAT;
    const healthRecovered = healthPercent >= AI_CONFIG.RETREAT_EXIT_HEALTH;

    // If we've healed enough AND waited long enough, can exit normally
    if (healthRecovered && minDurationMet) {
      return true;
    }

    // If we've waited long enough but NOT healed, trigger all-in mode
    if (minDurationMet && !healthRecovered) {
      this.allInMode = true;
      return true; // Force exit to go all-in
    }

    return false;
  }

  /**
   * Check if AI is in "all-in" mode (retreat timer expired without healing)
   * In this mode, AI should fight aggressively regardless of health
   */
  isAllInMode(): boolean {
    return this.allInMode;
  }

  /**
   * Reset all-in mode (called when threat is eliminated or AI heals)
   */
  resetAllInMode(): void {
    this.allInMode = false;
  }

  /**
   * Check if retreat is committed (for external queries)
   */
  isRetreatCommitted(): boolean {
    return this.retreatCommitted;
  }

  /**
   * Check if AI can exit current state to transition to target state
   * Enforces minimum state durations
   */
  canExitCurrentState(targetState: AIState): boolean {
    const minDuration = this.getMinDurationForState(this.currentState);

    // If we haven't met minimum duration, check if target state can interrupt
    if (this.stateTimer < minDuration) {
      return this.canInterrupt(this.currentState, targetState);
    }

    return true;
  }

  /**
   * Get minimum duration for a state
   */
  getMinDurationForState(state: AIState): number {
    switch (state) {
      case AIState.FLEE:
        return 0; // FLEE can always be exited once safe
      case AIState.RETREAT:
        return AI_CONFIG.STATE_MIN_DURATION_RETREAT;
      case AIState.ENGAGE:
        return AI_CONFIG.STATE_MIN_DURATION_ENGAGE;
      case AIState.LOOT:
        return AI_CONFIG.STATE_MIN_DURATION_LOOT;
      case AIState.HUNT:
        return AI_CONFIG.STATE_MIN_DURATION_HUNT;
      case AIState.EXPLORE:
        return AI_CONFIG.STATE_MIN_DURATION_EXPLORE;
      default:
        return 0;
    }
  }

  /**
   * Check if target state can interrupt current state before minimum duration
   * - FLEE can interrupt ANY state (toxic zone emergency)
   * - RETREAT cannot be interrupted by anything except FLEE
   * - ENGAGE can only be interrupted by RETREAT or FLEE
   * - Other states can be interrupted by ENGAGE, RETREAT, or FLEE
   */
  private canInterrupt(fromState: AIState, toState: AIState): boolean {
    // FLEE can always interrupt - toxic zone is life or death
    if (toState === AIState.FLEE) {
      return true;
    }

    // FLEE can only be exited when safe (handled externally)
    if (fromState === AIState.FLEE) {
      return false;
    }

    // RETREAT cannot be interrupted - must commit fully
    if (fromState === AIState.RETREAT) {
      return false;
    }

    // ENGAGE can only be interrupted by RETREAT
    if (fromState === AIState.ENGAGE) {
      return toState === AIState.RETREAT;
    }

    // Other states (LOOT, HUNT, EXPLORE) can be interrupted by ENGAGE or RETREAT
    return toState === AIState.ENGAGE || toState === AIState.RETREAT;
  }

  // ============ Inventory Helpers ============

  hasAnyWeapon(inventory: InventoryItem[]): boolean {
    const weaponTypes = ["pistol", "shotgun", "ak47", "bolt_action_rifle", "knife"];
    return inventory.some((item) => item && weaponTypes.includes(item.itemType));
  }

  hasGoodWeapon(inventory: InventoryItem[]): boolean {
    return inventory.some(
      (item) => item && (GOOD_WEAPONS as readonly string[]).includes(item.itemType)
    );
  }

  hasBandage(inventory: InventoryItem[]): boolean {
    return inventory.some((item) => item && item.itemType === "bandage");
  }

  hasAmmoForWeapons(inventory: InventoryItem[]): boolean {
    const weapons = inventory.filter(
      (item) => item && Object.keys(WEAPON_AMMO_MAP).includes(item.itemType)
    );

    if (weapons.length === 0) {
      // No ranged weapons, check for melee
      return inventory.some(
        (item) => item && (MELEE_WEAPONS as readonly string[]).includes(item.itemType)
      );
    }

    for (const weapon of weapons) {
      if (!weapon) continue;
      const ammoType = WEAPON_AMMO_MAP[weapon.itemType];
      if (!ammoType) continue;

      const ammo = inventory.find((item) => item && item.itemType === ammoType);
      if (ammo && (ammo.state?.count ?? 0) > 0) {
        return true;
      }
    }

    return false;
  }

  hasRangedWeaponWithAmmo(inventory: InventoryItem[]): boolean {
    const rangedWeapons = ["pistol", "shotgun", "ak47", "bolt_action_rifle"];

    for (const weaponType of rangedWeapons) {
      const hasWeapon = inventory.some((item) => item && item.itemType === weaponType);
      if (!hasWeapon) continue;

      const ammoType = WEAPON_AMMO_MAP[weaponType];
      if (!ammoType) continue;

      const ammo = inventory.find((item) => item && item.itemType === ammoType);
      if (ammo && (ammo.state?.count ?? 0) > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if AI is ready to hunt - requires:
   * - Pistol with at least 5 ammo, OR
   * - Any good ranged weapon (shotgun, ak47, bolt action) with at least 1 ammo
   */
  isReadyToHunt(inventory: InventoryItem[]): boolean {
    // Check for good ranged weapons first (shotgun, ak47, bolt action) - need any ammo
    for (const weaponType of GOOD_WEAPONS) {
      const hasWeapon = inventory.some((item) => item && item.itemType === weaponType);
      if (!hasWeapon) continue;

      const ammoType = WEAPON_AMMO_MAP[weaponType];
      if (!ammoType) continue;

      const ammo = inventory.find((item) => item && item.itemType === ammoType);
      if (ammo && (ammo.state?.count ?? 0) > 0) {
        return true;
      }
    }

    // Check for pistol with at least 5 ammo
    const hasPistol = inventory.some((item) => item && item.itemType === "pistol");
    if (hasPistol) {
      const pistolAmmo = inventory.find((item) => item && item.itemType === "pistol_ammo");
      if (pistolAmmo && (pistolAmmo.state?.count ?? 0) >= 5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the index of best weapon to use
   * Returns 1-based index for selectInventoryItem
   */
  getBestWeaponIndex(inventory: InventoryItem[]): number {
    // If we have ranged weapon with ammo, use it
    const rangedPriority = ["bolt_action_rifle", "ak47", "shotgun", "pistol"];

    for (const weaponType of rangedPriority) {
      const index = inventory.findIndex((item) => item && item.itemType === weaponType);
      if (index === -1) continue;

      const ammoType = WEAPON_AMMO_MAP[weaponType];
      if (ammoType) {
        const ammo = inventory.find((item) => item && item.itemType === ammoType);
        if (ammo && (ammo.state?.count ?? 0) > 0) {
          return index + 1;
        }
      }
    }

    // Fall back to knife
    const knifeIndex = inventory.findIndex((item) => item && item.itemType === "knife");
    if (knifeIndex !== -1) {
      return knifeIndex + 1;
    }

    // Return first weapon we have
    for (const weaponType of [...rangedPriority, "knife"]) {
      const index = inventory.findIndex((item) => item && item.itemType === weaponType);
      if (index !== -1) return index + 1;
    }

    return -1;
  }

  /**
   * Get knife index specifically
   */
  getKnifeIndex(inventory: InventoryItem[]): number {
    const index = inventory.findIndex((item) => item && item.itemType === "knife");
    return index !== -1 ? index + 1 : -1;
  }

  /**
   * Get bandage index
   */
  getBandageIndex(inventory: InventoryItem[]): number {
    return inventory.findIndex((item) => item && item.itemType === "bandage");
  }
}
