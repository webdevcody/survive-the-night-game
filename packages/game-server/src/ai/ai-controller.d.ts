import { Player } from "@/entities/players/player";
import { IGameManagers } from "@/managers/types";
/**
 * AI Controller - Generates input for an AI player each tick
 *
 * Design Philosophy:
 * - React to immediate threats (survival instinct)
 * - Smooth, continuous movement (no stop-start)
 * - Stuck detection to prevent getting stuck on obstacles
 * - Unified combat for both zombies and players
 */
export declare class AIController {
    private player;
    private gameManagers;
    private stateMachine;
    private targetingSystem;
    private pathfinder;
    private threatTracker;
    private explorationTracker;
    private timerManager;
    private movementController;
    private currentTarget;
    private combatTarget;
    private forceRetarget;
    private lastDecision;
    private currentEnhancedThreatInfo;
    private isInCombat;
    private currentSupplyStatus;
    private engageHandler;
    private retreatHandler;
    private lootHandler;
    private huntHandler;
    private exploreHandler;
    private static readonly STAMINA_RESERVE_THRESHOLD;
    private static readonly STAMINA_CRITICAL_THRESHOLD;
    constructor(player: Player, gameManagers: IGameManagers);
    /**
     * Check if AI should sprint based on stamina and urgency
     * @param isUrgent - true for escaping, immediate threats, or combat
     */
    private shouldSprint;
    /**
     * Called when this AI takes damage
     * This is KEY for the "attack who's hitting me" fix
     */
    onDamaged(attackerId: number, entityType: "zombie" | "player", damage: number): void;
    /**
     * Get the current weapon type
     */
    private getCurrentWeaponType;
    /**
     * Check for enemies in melee range and attack them immediately
     * This is called BEFORE state-specific behavior to ensure AI always attacks
     * when close enough, regardless of state (RETREAT, LOOT, etc.)
     * Returns true if an enemy was found and attacked, false otherwise
     *
     * NOTE: If AI has a ranged weapon with ammo, this function returns false
     * to allow the normal state handlers (ENGAGE/HUNT) to handle ranged combat.
     */
    private checkAndAttackMeleeRangeEnemies;
    /**
     * Main update - called every game tick
     */
    update(deltaTime: number): void;
    /**
     * Simplified zombie AI update - completely separate from human AI behavior
     * Zombies only do one thing: find closest living non-zombie player and attack them
     * No looting, no retreating, no inventory management
     */
    private updateZombieAI;
    /**
     * Check if AI is stuck and handle it
     */
    private checkIfStuck;
    /**
     * Manage inventory - drop useless ammo when inventory is full
     * This prevents AI from getting stuck trying to pick up items they can't carry
     */
    private manageInventory;
    /**
     * Check if AI is snared in a bear trap and interact to escape
     */
    private checkAndEscapeBearTrap;
    /**
     * Make high-level decisions (legacy method kept for compatibility)
     */
    private makeDecisions;
    /**
     * Make enhanced decisions using the new decision engine with readiness
     * Uses hysteresis and combat readiness scoring to prevent state oscillation
     */
    private makeEnhancedDecisions;
    /**
     * Map a decision to the appropriate state
     */
    private decisionToState;
    /**
     * Check if we should update target for current state
     */
    private shouldUpdateTarget;
    /**
     * Select appropriate weapon for current state
     */
    private selectAppropriateWeapon;
    /**
     * Update current target based on state
     */
    private updateTarget;
    /**
     * Recalculate path to current target
     * Uses findWalkableWaypoint to find alternative paths if direct target is blocked
     */
    private recalculatePath;
    /**
     * Build context object for state handlers
     */
    private buildStateContext;
    /**
     * Check for opportunistic actions - crate destruction and item pickup
     * Returns true if an opportunistic action was taken
     */
    private checkOpportunisticActions;
    /**
     * Generate input based on current state
     */
    private generateInput;
    /**
     * Old handler methods removed - now in separate state files:
     * - handleEngageBehavior -> states/engage-state.ts
     * - handleRetreatBehavior -> states/retreat-state.ts
     * - handleLootBehavior -> states/loot-state.ts
     * - handleHuntBehavior -> states/hunt-state.ts
     * - handleExploreBehavior -> states/explore-state.ts
     */
    /**
     * Find a walkable position near the target using pathfinding
     * If the direct target is blocked, tries nearby positions in a spiral pattern
     * Returns a waypoint if found, or null if no walkable position found
     */
    private findWalkableWaypoint;
    /**
     * Handle melee combat with kiting
     * Uses pathfinding to navigate around obstacles
     * Includes disengage and escape behaviors
     */
    private handleMeleeCombat;
    /**
     * Handle escape behavior - flee completely when very low health
     * Uses safestRetreatDirection from enhanced threat info to avoid ALL threats
     */
    private handleEscapeBehavior;
    /**
     * Handle disengage behavior - run away to gather supplies
     * But if chased and enemy gets too close, fight back in defense
     * Uses safestRetreatDirection to avoid ALL threats
     */
    private handleDisengageBehavior;
    /**
     * Handle kiting retreat - move away while still fighting
     * Uses pathfinding to navigate around obstacles
     */
    private handleKitingRetreat;
    /**
     * Handle RETREAT state - flee and heal
     * Uses safest retreat direction to avoid all threats
     * ALWAYS uses pathfinding - never moves directly without a valid path
     * Actively seeks bandages while retreating to heal up
     */
    private handleRetreatBehavior;
    /**
     * Find a random walkable direction and set movement
     * Used as fallback when no waypoint is available
     */
    private findRandomWalkableDirection;
    /**
     * Handle LOOT state - collect items
     */
    private handleLootBehavior;
    /**
     * Handle HUNT state - search for players and attack
     */
    private handleHuntBehavior;
    /**
     * Handle EXPLORE state - wander around
     */
    private handleExploreBehavior;
    /**
     * Move toward current waypoint
     * Returns true if movement was generated, false if waypoint was null or reached
     */
    private moveTowardWaypoint;
    /**
     * Smooth movement to prevent jerky changes
     */
    private smoothMovement;
    /**
     * Calculate aim angle from source to target
     */
    private calculateAimAngle;
    /**
     * Determine facing direction from velocity
     */
    private determineFacing;
    /**
     * Convert angle to direction
     */
    private angleToDirection;
}
