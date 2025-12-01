import { Player } from "@/entities/players/player";
import { IEntity } from "@/entities/types";
import { IGameManagers } from "@/managers/types";
import { Input } from "@shared/util/input";
import { Direction } from "@/util/direction";
import { velocityTowards, distance } from "@shared/util/physics";
import Vector2 from "@shared/util/vector2";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import Destructible from "@/extensions/destructible";
import Snared from "@/extensions/snared";
import { AIStateMachine, AIState, KitePhase } from "./ai-state-machine";
import { AITargetingSystem, AITarget, EnhancedThreatInfo } from "./ai-targeting";
import { AIPathfinder } from "./ai-pathfinding";
import { AI_CONFIG, WEAPON_RANGES } from "./ai-config";
import { ThreatTracker } from "./ai-threat-tracker";
import { AIDecision, AIDecisionEngine, DecisionResult } from "./ai-decision-engine";
import { AIExplorationTracker } from "./ai-exploration-tracker";
import { CombatReadinessCalculator, SupplyStatus } from "./ai-readiness";
import { Entities, getZombieTypesSet } from "@shared/constants";
import { getConfig } from "@shared/config";
import Inventory from "@/extensions/inventory";
import Carryable from "@/extensions/carryable";
import {
  EngageStateHandler,
  RetreatStateHandler,
  LootStateHandler,
  HuntStateHandler,
  ExploreStateHandler,
  FleeStateHandler,
  AIStateContext,
} from "./states";
import { AIInteractionHelper } from "./ai-interaction-helper";
import {
  getEffectiveShootingRange,
  getMeleeAttackRange,
  getMeleeRangeWithBuffer,
  calculateRetreatPosition,
  equipMeleeWeaponForCrate,
  calculateAimAngle,
  angleToDirection,
  aimAtTarget,
} from "./ai-utils";
import { AITimerManager } from "./ai-timer-manager";
import { AIMovementController } from "./ai-movement-controller";

/**
 * AI Controller - Generates input for an AI player each tick
 *
 * Design Philosophy:
 * - React to immediate threats (survival instinct)
 * - Smooth, continuous movement (no stop-start)
 * - Stuck detection to prevent getting stuck on obstacles
 * - Unified combat for both zombies and players
 */
export class AIController {
  private player: Player;
  private gameManagers: IGameManagers;
  private stateMachine: AIStateMachine;
  private targetingSystem: AITargetingSystem;
  private pathfinder: AIPathfinder;
  private threatTracker: ThreatTracker;
  private explorationTracker: AIExplorationTracker;

  // Timer management
  private timerManager: AITimerManager = new AITimerManager();

  // Movement controller
  private movementController: AIMovementController;

  // Current targets
  private currentTarget: AITarget | null = null;
  private combatTarget: AITarget | null = null;

  // Enhanced threat tracking
  private forceRetarget: boolean = false;
  private lastDecision: DecisionResult | null = null;
  private currentEnhancedThreatInfo: EnhancedThreatInfo | null = null;
  private isInCombat: boolean = false;

  // Combat readiness tracking
  private currentSupplyStatus: SupplyStatus | null = null;

  // State handlers
  private engageHandler: EngageStateHandler;
  private retreatHandler: RetreatStateHandler;
  private lootHandler: LootStateHandler;
  private huntHandler: HuntStateHandler;
  private exploreHandler: ExploreStateHandler;
  private fleeHandler: FleeStateHandler;

  // Stamina management
  private static readonly STAMINA_RESERVE_THRESHOLD = 0.3; // Don't sprint below 30% stamina unless urgent
  private static readonly STAMINA_CRITICAL_THRESHOLD = 0.1; // Below 10%, never sprint unless escaping

  constructor(player: Player, gameManagers: IGameManagers) {
    this.player = player;
    this.gameManagers = gameManagers;
    this.stateMachine = new AIStateMachine();
    this.targetingSystem = new AITargetingSystem(gameManagers);
    this.pathfinder = new AIPathfinder(gameManagers);
    this.threatTracker = new ThreatTracker();
    this.explorationTracker = new AIExplorationTracker();

    // Initialize movement controller
    this.movementController = new AIMovementController(this.pathfinder, this.timerManager);

    // Initialize state handlers
    this.engageHandler = new EngageStateHandler();
    this.retreatHandler = new RetreatStateHandler();
    this.lootHandler = new LootStateHandler();
    this.huntHandler = new HuntStateHandler();
    this.exploreHandler = new ExploreStateHandler();
    this.fleeHandler = new FleeStateHandler();
  }

  /**
   * Check if AI should sprint based on stamina and urgency
   * @param isUrgent - true for escaping, immediate threats, or combat
   */
  private shouldSprint(isUrgent: boolean = false): boolean {
    // Access stamina through the player's serialized fields
    const stamina = (this.player as any).serialized?.get("stamina") ?? 100;
    const maxStamina = (this.player as any).serialized?.get("maxStamina") ?? 100;
    const staminaPercent = stamina / maxStamina;

    // Critical stamina - only sprint if escaping for survival
    if (staminaPercent < AIController.STAMINA_CRITICAL_THRESHOLD) {
      return isUrgent && this.stateMachine.getIsEscaping();
    }

    // Low stamina - only sprint for urgent situations
    if (staminaPercent < AIController.STAMINA_RESERVE_THRESHOLD) {
      return isUrgent;
    }

    // Have stamina - can sprint
    return true;
  }

  /**
   * Called when this AI takes damage
   * This is KEY for the "attack who's hitting me" fix
   */
  onDamaged(attackerId: number, entityType: "zombie" | "player", damage: number): void {
    // Record the damage
    this.threatTracker.recordDamage(attackerId, entityType, damage);

    // Force immediate retarget if the attacker is different from current target
    const currentTargetId = this.combatTarget?.entity?.getId() ?? null;
    if (currentTargetId !== attackerId) {
      this.forceRetarget = true;
    }

    // Add reaction delay for humanlike response
    this.timerManager.reactionTimer = AI_CONFIG.REACTION_DELAY;
  }

  /**
   * Get the current weapon type
   */
  private getCurrentWeaponType(): string | undefined {
    const activeItem = this.player.activeItem;
    return activeItem?.itemType;
  }

  /**
   * Check for enemies in melee range and attack them immediately
   * This is called BEFORE state-specific behavior to ensure AI always attacks
   * when close enough, regardless of state (RETREAT, LOOT, etc.)
   * Returns true if an enemy was found and attacked, false otherwise
   *
   * NOTE: If AI has a ranged weapon with ammo, this function returns false
   * to allow the normal state handlers (ENGAGE/HUNT) to handle ranged combat.
   */
  private checkAndAttackMeleeRangeEnemies(input: Input, playerPos: Vector2): boolean {
    const inventory = this.player.getInventory();

    // If AI has a ranged weapon with ammo, DON'T force melee combat
    // Let the normal state handlers (ENGAGE/HUNT) manage ranged combat instead
    const hasRangedWeaponWithAmmo = this.stateMachine.hasRangedWeaponWithAmmo(inventory);
    if (hasRangedWeaponWithAmmo) {
      return false; // Skip melee override - use ranged combat from state handlers
    }

    // Get current weapon and melee range
    const activeItem = this.player.activeItem;
    let meleeRange = getMeleeAttackRange(activeItem || undefined);

    // If no melee weapon, check if we have any weapon at all
    const hasMeleeWeapon = inventory.some(
      (item) => item && (item.itemType === "knife" || item.itemType === "baseball_bat")
    );

    // If no melee weapon, try to equip one
    if (!hasMeleeWeapon) {
      const knifeIndex = inventory.findIndex((item) => item && item.itemType === "knife");
      if (knifeIndex >= 0) {
        this.player.selectInventoryItem(knifeIndex + 1);
        meleeRange = getMeleeAttackRange({ itemType: "knife" });
      } else {
        // No melee weapon available - can't attack in melee
        return false;
      }
    } else if (
      !activeItem ||
      (activeItem.itemType !== "knife" && activeItem.itemType !== "baseball_bat")
    ) {
      // Have melee weapon but not equipped - equip it
      const knifeIndex = inventory.findIndex((item) => item && item.itemType === "knife");
      const batIndex = inventory.findIndex((item) => item && item.itemType === "baseball_bat");

      if (knifeIndex >= 0) {
        this.player.selectInventoryItem(knifeIndex + 1);
        meleeRange = getMeleeAttackRange({ itemType: "knife" });
      } else if (batIndex >= 0) {
        this.player.selectInventoryItem(batIndex + 1);
        meleeRange = getMeleeAttackRange({ itemType: "baseball_bat" });
      }
    }

    const entityManager = this.gameManagers.getEntityManager();
    const zombieTypes = getZombieTypesSet();

    // Check for nearby enemies (zombies and players)
    const nearbyEntities = entityManager.getNearbyEntities(
      playerPos,
      meleeRange + 20 // Small buffer to detect enemies slightly outside range
    );

    let closestEnemy: IEntity | null = null;
    let closestDistance = Infinity;
    let closestPos: Vector2 | null = null;

    // Check if this AI is a zombie - zombies only attack non-zombie players
    const isZombieAI = this.player.isZombie();

    // Get game mode settings to determine if we should attack other players
    const strategy = this.gameManagers.getGameServer().getGameLoop().getGameModeStrategy();
    const friendlyFireEnabled = strategy.getConfig().friendlyFireEnabled;

    // Zombie AI doesn't attack other zombies
    if (!isZombieAI) {
      // Check zombies (only for non-zombie AI)
      for (const entity of nearbyEntities) {
        const entityType = entity.getType();
        if (!zombieTypes.has(entityType as any)) continue;
        if (!entity.hasExt(Positionable)) continue;
        if (entity.hasExt(Destructible) && entity.getExt(Destructible).isDead()) continue;

        const entityPos = entity.getExt(Positionable).getCenterPosition();
        const dist = distance(playerPos, entityPos);

        if (dist <= meleeRange && dist < closestDistance) {
          closestEnemy = entity;
          closestDistance = dist;
          closestPos = entityPos;
        }
      }
    }

    // Check players
    const players = entityManager.getPlayerEntities() as Player[];
    for (const otherPlayer of players) {
      if (otherPlayer.getId() === this.player.getId()) continue;
      if (otherPlayer.isDead()) continue;

      // Determine if this player is a valid target based on game mode and zombie status
      // - Zombie AI: only attacks non-zombie players (always)
      // - Human AI with friendly fire OFF: only attacks zombie players
      // - Human AI with friendly fire ON: attacks all other players
      const otherIsZombie = otherPlayer.isZombie();

      if (isZombieAI) {
        // Zombie AI only attacks non-zombie players
        if (otherIsZombie) continue;
      } else {
        // Human AI - check friendly fire rules
        if (!friendlyFireEnabled && !otherIsZombie) {
          // Friendly fire disabled and other player is human - skip
          continue;
        }
      }

      const otherPos = otherPlayer.getCenterPosition();
      const dist = distance(playerPos, otherPos);

      if (dist <= meleeRange && dist < closestDistance) {
        closestEnemy = otherPlayer as unknown as IEntity;
        closestDistance = dist;
        closestPos = otherPos;
      }
    }

    // If we found an enemy in melee range, attack them immediately
    if (closestEnemy && closestPos) {
      // Aim at enemy
      aimAtTarget(input, playerPos, closestPos);

      // Attack if fire timer allows
      if (this.timerManager.fireTimer >= AI_CONFIG.FIRE_RATE_DELAY) {
        input.fire = true;
        this.timerManager.fireTimer = 0;
      }

      // Stop moving to attack (stay in place)
      input.dx = 0;
      input.dy = 0;

      // Update combat target for tracking
      if (!this.combatTarget || this.combatTarget.entity?.getId() !== closestEnemy.getId()) {
        this.combatTarget = {
          type: "enemy",
          entity: closestEnemy,
          position: closestPos,
          priority: AI_CONFIG.PRIORITY_IMMEDIATE_THREAT,
          distance: closestDistance,
        };
      }

      return true;
    }

    return false;
  }

  /**
   * Main update - called every game tick
   */
  update(deltaTime: number): void {
    // ZOMBIE AI: Completely separate, simplified behavior
    // Zombies just pathfind to closest living player and attack - no looting, retreating, etc.
    if (this.player.isZombie()) {
      this.updateZombieAI(deltaTime);
      return;
    }

    // Update all timers
    this.timerManager.update(deltaTime);

    // Check if snared in bear trap and escape
    this.checkAndEscapeBearTrap();

    // CRITICAL: Check if we're in a toxic zone - this takes priority over everything
    const playerPos = this.player.getCenterPosition();
    const isInToxicZone = this.pathfinder.isToxicPosition(playerPos);

    if (isInToxicZone) {
      // Force FLEE state - toxic zone is life or death
      this.stateMachine.forceTransitionTo(AIState.FLEE);
      // Clear ALL targets to focus only on escaping - no combat while fleeing
      this.currentTarget = null;
      this.combatTarget = null;
      this.movementController.clearWaypoint();
    } else if (this.stateMachine.getCurrentState() === AIState.FLEE) {
      // We were fleeing but reached safety - return to normal behavior
      this.stateMachine.forceTransitionTo(AIState.EXPLORE);
    }

    // FLEE state: Skip ALL combat-related logic - pure escape mode
    // This prevents the AI from oscillating between FLEE and ENGAGE
    const isFleeing = this.stateMachine.getCurrentState() === AIState.FLEE;

    if (isFleeing) {
      // In FLEE state - don't do any threat detection or combat targeting
      // Just generate movement input and escape
      this.combatTarget = null;
      this.isInCombat = false;

      // Generate and apply input (escape movement only)
      const input = this.generateInput();
      this.player.setInput(input);

      // Update AI state for debugging
      if (AI_CONFIG.DEBUG_SHOW_AI_STATE) {
        const state = this.stateMachine.getCurrentState();
        (this.player as any).serialized.set("aiState", state);
      }
      return; // Skip all other logic
    }

    // Get ENHANCED threat info with damage-based scoring (KEY FIX)
    const damageHistory = this.threatTracker.getDamageHistory();
    const weaponType = this.getCurrentWeaponType();
    const enhancedThreatInfo = this.targetingSystem.getEnhancedThreatInfo(
      this.player,
      damageHistory,
      weaponType
    );
    this.currentEnhancedThreatInfo = enhancedThreatInfo;

    // Determine if in combat (for adaptive retarget interval)
    // Consider in combat if there's a nearby threat, not just when taking damage
    // This ensures immediate response when being chased
    this.isInCombat =
      enhancedThreatInfo.hasImmediateThreat ||
      enhancedThreatInfo.hasNearbyEnemy ||
      this.threatTracker.hasRecentDamage(2000);

    // Calculate adaptive retarget interval
    const retargetInterval = this.isInCombat
      ? AI_CONFIG.COMBAT_RETARGET_INTERVAL
      : AI_CONFIG.IDLE_RETARGET_INTERVAL;

    // Update combat target using enhanced scoring
    // Force retarget if: flag is set, timer expired, or no target during threat
    // Retarget immediately when a new threat appears (being chased) - no delay
    const shouldRetarget =
      this.forceRetarget ||
      this.timerManager.retargetTimer >= retargetInterval ||
      (this.combatTarget === null && enhancedThreatInfo.hasNearbyEnemy);

    if (shouldRetarget && this.timerManager.reactionTimer <= 0) {
      this.timerManager.retargetTimer = 0;
      this.forceRetarget = false;

      // Don't set combat target if we're in RETREAT state (unless it's an immediate threat)
      const currentState = this.stateMachine.getCurrentState();
      if (currentState === AIState.RETREAT && !enhancedThreatInfo.hasImmediateThreat) {
        // In RETREAT state - clear combat target so we don't chase
        this.combatTarget = null;
      } else {
        // Use enhanced threat-scored targeting (KEY FIX)
        if (enhancedThreatInfo.immediateThreat) {
          this.combatTarget = this.targetingSystem.findBestEnemy(
            this.player,
            damageHistory,
            weaponType
          );
        } else if (!enhancedThreatInfo.hasNearbyEnemy) {
          this.combatTarget = null;
        }
      }
    }

    // Always validate combat target is still alive - clear if dead
    if (this.combatTarget?.entity) {
      const target = this.combatTarget.entity;
      const isTargetDead =
        target instanceof Player
          ? target.isDead()
          : target.hasExt(Destructible) && target.getExt(Destructible).isDead();
      if (isTargetDead) {
        this.combatTarget = null;
        this.forceRetarget = true;
      }
    }

    // Check if stuck periodically
    if (this.timerManager.stuckCheckTimer >= AI_CONFIG.STUCK_CHECK_INTERVAL) {
      this.timerManager.stuckCheckTimer = 0;
      this.checkIfStuck();
    }

    // Manage inventory periodically - drop useless ammo when full
    if (this.timerManager.inventoryManagementTimer >= AI_CONFIG.INVENTORY_MANAGEMENT_INTERVAL) {
      this.timerManager.inventoryManagementTimer = 0;
      this.manageInventory();
    }

    // Mark current position as explored
    this.explorationTracker.markExplored(playerPos);

    // Make high-level decisions periodically
    if (this.timerManager.decisionTimer >= AI_CONFIG.DECISION_INTERVAL) {
      this.timerManager.decisionTimer = 0;
      this.makeEnhancedDecisions(enhancedThreatInfo, deltaTime);
    }

    // Update kite timer during combat OR when disengaging/escaping
    // This ensures disengage/escape timers keep counting even after state changes
    if (
      this.stateMachine.getCurrentState() === AIState.ENGAGE ||
      this.stateMachine.getIsDisengaging() ||
      this.stateMachine.getIsEscaping()
    ) {
      this.stateMachine.updateKiteTimer(deltaTime);
    }

    // Recalculate path periodically
    if (this.timerManager.pathRecalcTimer >= AI_CONFIG.PATH_RECALC_INTERVAL) {
      this.timerManager.pathRecalcTimer = 0;
      this.recalculatePath();
    }

    // Generate and apply input
    const input = this.generateInput();
    this.player.setInput(input);

    // Update AI state for debugging (if debug flag is enabled)
    if (AI_CONFIG.DEBUG_SHOW_AI_STATE) {
      const state = this.stateMachine.getCurrentState();
      (this.player as any).serialized.set("aiState", state);
    }
  }

  /**
   * Simplified zombie AI update - completely separate from human AI behavior
   * Zombies only do one thing: find closest living non-zombie player and attack them
   * No looting, no retreating, no inventory management
   */
  private updateZombieAI(deltaTime: number): void {
    // Update basic timers
    this.timerManager.fireTimer += deltaTime;
    this.timerManager.pathRecalcTimer += deltaTime;
    this.timerManager.stuckCheckTimer += deltaTime;

    // Check if snared in bear trap and escape
    this.checkAndEscapeBearTrap();

    const playerPos = this.player.getCenterPosition();
    const entityManager = this.gameManagers.getEntityManager();

    // Find the closest living non-zombie player
    const players = entityManager.getPlayerEntities() as Player[];
    let closestPlayer: Player | null = null;
    let closestDistance = Infinity;

    for (const otherPlayer of players) {
      if (otherPlayer.getId() === this.player.getId()) continue;
      if (otherPlayer.isDead()) continue;
      if (otherPlayer.isZombie()) continue; // Don't target other zombies

      const otherPos = otherPlayer.getCenterPosition();
      const dist = distance(playerPos, otherPos);

      if (dist < closestDistance) {
        closestDistance = dist;
        closestPlayer = otherPlayer;
      }
    }

    // Create input for this tick
    const input: Input = {
      facing: Direction.Right,
      dx: 0,
      dy: 0,
      fire: false,
      sprint: false,
      aimAngle: undefined,
    };

    // If we found a target, pathfind to them and attack
    if (closestPlayer) {
      const targetPos = closestPlayer.getCenterPosition();

      // Check if in melee attack range - use actual zombie claw range
      const meleeRange = getConfig().combat.ZOMBIE_PLAYER_CLAW_RANGE;

      if (closestDistance <= meleeRange) {
        // In range - attack!
        aimAtTarget(input, playerPos, targetPos);

        if (this.timerManager.fireTimer >= AI_CONFIG.FIRE_RATE_DELAY) {
          input.fire = true;
          this.timerManager.fireTimer = 0;
        }

        // Stop moving when attacking
        input.dx = 0;
        input.dy = 0;
      } else {
        // Move toward target using movement controller
        const moved = this.movementController.moveTowardTarget(input, playerPos, targetPos);
        if (moved) {
          // Movement was generated, determine facing from input
          const vel = new Vector2(input.dx, input.dy);
          input.facing = this.determineFacing(vel);
        }

        // Always sprint toward prey
        input.sprint = true;

        // Aim at target while moving
        aimAtTarget(input, playerPos, targetPos);
      }
    } else {
      // No living players found - wander randomly
      if (
        this.timerManager.pathRecalcTimer >= AI_CONFIG.PATH_RECALC_INTERVAL * 2 ||
        !this.movementController.getCurrentWaypoint()
      ) {
        this.timerManager.pathRecalcTimer = 0;

        // Pick a random direction to wander
        const randomAngle = Math.random() * Math.PI * 2;
        const wanderDist = 200 + Math.random() * 200;
        const wanderTarget = new Vector2(
          playerPos.x + Math.cos(randomAngle) * wanderDist,
          playerPos.y + Math.sin(randomAngle) * wanderDist
        );

        const waypoint = this.pathfinder.pathTowardsAvoidingToxic(playerPos, wanderTarget);
        this.movementController.setCurrentWaypoint(waypoint || wanderTarget);
      }

      const waypoint = this.movementController.getCurrentWaypoint();
      if (waypoint) {
        const waypointDist = distance(playerPos, waypoint);

        if (waypointDist < AI_CONFIG.WAYPOINT_THRESHOLD) {
          this.movementController.clearWaypoint();
        } else {
          const vel = velocityTowards(playerPos, waypoint);
          input.dx = vel.x;
          input.dy = vel.y;
          input.facing = this.determineFacing(vel);
        }
      }
    }

    // Check if stuck and handle it
    if (this.timerManager.stuckCheckTimer >= AI_CONFIG.STUCK_CHECK_INTERVAL) {
      this.timerManager.stuckCheckTimer = 0;
      this.checkIfStuck();
    }

    // Smooth movement to avoid jerkiness
    this.smoothMovement(input);

    // Apply input to player
    this.player.setInput(input);

    // Update AI state for debugging
    if (AI_CONFIG.DEBUG_SHOW_AI_STATE) {
      (this.player as any).serialized.set("aiState", "ZOMBIE_HUNT");
    }
  }

  /**
   * Check if AI is stuck and handle it
   */
  private checkIfStuck(): void {
    const currentPos = this.player.getCenterPosition();
    this.movementController.checkIfStuck(
      currentPos,
      AI_CONFIG.STUCK_DISTANCE_THRESHOLD,
      AI_CONFIG.MAX_TARGET_ATTEMPTS,
      () => {
        // On stuck callback - clear targets
        this.currentTarget = null;
        this.movementController.clearWaypoint();
      }
    );
  }

  /**
   * Manage inventory - drop useless ammo when inventory is full
   * This prevents AI from getting stuck trying to pick up items they can't carry
   */
  private manageInventory(): void {
    const inventory = this.player.getInventory();

    // Only manage when inventory is full
    if (!this.targetingSystem.isInventoryFull(inventory)) {
      return;
    }

    // Find useless ammo (ammo for weapons we don't have)
    const uselessAmmoIndex = this.targetingSystem.findUselessAmmoIndex(inventory);

    if (uselessAmmoIndex >= 0) {
      const item = inventory[uselessAmmoIndex];
      if (item) {
        // Drop the useless ammo
        const playerPos = this.player.getCenterPosition();
        const inventoryExt = this.player.getExt(Inventory);
        const removed = inventoryExt.removeItem(uselessAmmoIndex);

        if (removed) {
          // Create entity for the dropped item
          const entityManager = this.gameManagers.getEntityManager();
          const droppedEntity = entityManager.createEntityFromItem(removed);

          if (droppedEntity && droppedEntity.hasExt(Positionable)) {
            // Drop it near the player
            const dropPos = new Vector2(
              playerPos.x + (Math.random() - 0.5) * 32,
              playerPos.y + (Math.random() - 0.5) * 32
            );
            droppedEntity.getExt(Positionable).setPosition(dropPos);
            entityManager.addEntity(droppedEntity);

            // If the item had count state, preserve it
            if (removed.state && droppedEntity.hasExt(Carryable)) {
              droppedEntity.getExt(Carryable).setItemState(removed.state);
            }

            console.log(
              `[AI] ${this.player.getDisplayName()} dropped useless ${
                removed.itemType
              } to free inventory space`
            );
          }
        }
      }
    }
  }

  /**
   * Check if AI is snared in a bear trap and interact to escape
   */
  private checkAndEscapeBearTrap(): void {
    // Check if player is snared
    if (!this.player.hasExt(Snared)) {
      return;
    }

    // Only attempt escape periodically to avoid spamming interactions
    // Try every 0.1 seconds
    if (this.timerManager.interactTimer < 0.1) {
      return;
    }

    const playerId = this.player.getId();
    const entityManager = this.gameManagers.getEntityManager();

    // Find all bear traps
    const bearTraps = entityManager.getEntitiesByType(Entities.BEAR_TRAP);

    // Find the bear trap that has snared this player
    for (const bearTrap of bearTraps) {
      // Access the serialized field directly to check if this trap snared the player
      const snaredEntityId = (bearTrap as any).serialized?.get("snaredEntityId");

      if (snaredEntityId === playerId && bearTrap.hasExt(Interactive)) {
        // Found the bear trap that snared us - interact to escape
        bearTrap.getExt(Interactive).interact(playerId);
        this.timerManager.interactTimer = 0; // Reset timer after interaction
        return;
      }
    }
  }

  /**
   * Make high-level decisions (legacy method kept for compatibility)
   */
  private makeDecisions(threatInfo: EnhancedThreatInfo, deltaTime: number): void {
    const hasLootTarget = this.targetingSystem.findBestLootTarget(this.player) !== null;

    // Update state machine with enhanced threat info
    const decision = this.stateMachine.updateWithDecisionEngine(
      this.player,
      threatInfo,
      hasLootTarget,
      deltaTime
    );

    this.lastDecision = decision;
    const state = this.stateMachine.getCurrentState();

    // Select weapon based on state
    this.selectAppropriateWeapon(state);

    // Update target based on state (but keep current target if valid and not stuck)
    if (!this.currentTarget || this.stuckCount > 0 || this.shouldUpdateTarget(state)) {
      this.updateTarget(state);
    }
  }

  /**
   * Make enhanced decisions using the new decision engine with readiness
   * Uses hysteresis and combat readiness scoring to prevent state oscillation
   */
  private makeEnhancedDecisions(enhancedThreatInfo: EnhancedThreatInfo, deltaTime: number): void {
    const hasLootTarget = this.targetingSystem.findBestLootTarget(this.player) !== null;

    // Calculate supply status for readiness-based decisions
    this.currentSupplyStatus = CombatReadinessCalculator.calculate(this.player);

    // Get current state info for hysteresis
    const currentState = this.stateMachine.getCurrentState();
    const stateTimer = this.stateMachine.getStateTimer();
    const isAllInMode = this.stateMachine.isAllInMode();

    // Use the NEW enhanced decision engine with readiness
    const decision = AIDecisionEngine.makeEnhancedDecision(
      this.player,
      enhancedThreatInfo,
      this.currentSupplyStatus,
      currentState,
      stateTimer,
      isAllInMode,
      hasLootTarget
    );

    // Map decision to state (with hysteresis enforcement)
    const targetState = this.decisionToState(decision.decision);
    this.stateMachine.forceTransitionTo(targetState);

    // Reset all-in mode if AI killed threat or healed above exit threshold
    const healthPercent = this.player.getHealth() / this.player.getMaxHealth();
    if (isAllInMode && healthPercent >= AI_CONFIG.RETREAT_EXIT_HEALTH) {
      this.stateMachine.resetAllInMode();
    }

    this.lastDecision = decision;
    const state = this.stateMachine.getCurrentState();

    // If decision says to force retarget, do it now
    // BUT: Don't set combat target if we're in RETREAT state (unless it's an immediate threat we must fight)
    if (decision.shouldForceRetarget && decision.targetThreat) {
      // Only set combat target if NOT retreating, or if it's an immediate threat we must fight
      if (
        state !== AIState.RETREAT ||
        decision.decision === AIDecision.ENGAGE_THREAT ||
        decision.decision === AIDecision.ENGAGE_ATTACKER
      ) {
        const threat = decision.targetThreat;
        this.combatTarget = {
          type: "enemy",
          entity: threat.entity,
          position: threat.entity.getExt(Positionable).getCenterPosition(),
          priority: AI_CONFIG.PRIORITY_IMMEDIATE_THREAT,
          distance: threat.distance,
        };
      } else {
        // In RETREAT state - clear combat target so we don't chase
        this.combatTarget = null;
      }
    } else if (state === AIState.RETREAT) {
      // If in RETREAT state and decision doesn't require combat target, clear it
      this.combatTarget = null;
    }

    // Select weapon based on state and decision
    this.selectAppropriateWeapon(state);

    // Update target based on state (but keep current target if valid and not stuck)
    if (!this.currentTarget || this.stuckCount > 0 || this.shouldUpdateTarget(state)) {
      this.updateTarget(state);
    }
  }

  /**
   * Map a decision to the appropriate state
   */
  private decisionToState(decision: AIDecision): AIState {
    switch (decision) {
      case AIDecision.ESCAPE:
        return AIState.RETREAT;

      case AIDecision.ENGAGE_ATTACKER:
      case AIDecision.ENGAGE_THREAT:
      case AIDecision.FINISH_KILL:
      case AIDecision.RETREAT_AND_FIGHT:
        return AIState.ENGAGE;

      case AIDecision.DISENGAGE:
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
   * Check if we should update target for current state
   */
  private shouldUpdateTarget(state: AIState): boolean {
    // In combat, always use combat target
    if (state === AIState.ENGAGE) return true;

    // If current target doesn't match state, update
    if (!this.currentTarget) return true;

    if (
      state === AIState.HUNT &&
      this.currentTarget.type !== "player" &&
      this.currentTarget.type !== "position"
    ) {
      return true;
    }

    return false;
  }

  /**
   * Select appropriate weapon for current state
   */
  private selectAppropriateWeapon(state: AIState): void {
    const inventory = this.player.getInventory();
    const currentItem = this.player.activeItem;
    const currentItemType = currentItem?.itemType;

    if (state === AIState.ENGAGE) {
      // In combat - use best weapon
      const weaponIndex = this.stateMachine.getBestWeaponIndex(inventory);
      if (weaponIndex > 0) {
        const newItem = inventory[weaponIndex - 1];
        if (newItem && newItem.itemType !== currentItemType) {
          console.log(
            `[AI] ${this.player.getDisplayName()} switching to ${newItem.itemType} (ENGAGE)`
          );
        }
        this.player.selectInventoryItem(weaponIndex);
      }
    } else if (state === AIState.RETREAT) {
      // Retreating - try to use bandage
      const bandageIndex = this.stateMachine.getBandageIndex(inventory);
      if (bandageIndex >= 0) {
        const newItem = inventory[bandageIndex];
        if (newItem && newItem.itemType !== currentItemType) {
          console.log(
            `[AI] ${this.player.getDisplayName()} switching to ${newItem.itemType} (RETREAT)`
          );
        }
        this.player.selectInventoryItem(bandageIndex + 1);
      }
    } else if (state === AIState.HUNT) {
      // Hunting - use best weapon
      const weaponIndex = this.stateMachine.getBestWeaponIndex(inventory);
      if (weaponIndex > 0) {
        const newItem = inventory[weaponIndex - 1];
        if (newItem && newItem.itemType !== currentItemType) {
          console.log(
            `[AI] ${this.player.getDisplayName()} switching to ${newItem.itemType} (HUNT)`
          );
        }
        this.player.selectInventoryItem(weaponIndex);
      }
    }
  }

  /**
   * Update current target based on state
   */
  private updateTarget(state: AIState): void {
    switch (state) {
      case AIState.ENGAGE:
        // Combat target is handled separately
        break;

      case AIState.LOOT:
        // First check for special biomes if we don't have good weapons yet
        const inventory = this.player.getInventory();
        const hasGoodWeapon = this.targetingSystem.hasGoodWeapon(inventory);
        if (!hasGoodWeapon) {
          const exploredBiomes = this.explorationTracker.getExploredBiomes();
          const specialBiome = this.targetingSystem.findNearestSpecialBiome(
            this.player,
            exploredBiomes
          );
          if (specialBiome) {
            this.currentTarget = specialBiome;
            break;
          }
        }

        // Then check for crates (high priority)
        this.currentTarget = this.targetingSystem.findBestLootTarget(this.player);
        if (!this.currentTarget) {
          const exploredCells = this.explorationTracker.getExploredCells();
          this.currentTarget = this.targetingSystem.getExploreTarget(this.player, exploredCells);
        }
        break;

      case AIState.HUNT:
        this.currentTarget = this.targetingSystem.findBestPlayerTarget(this.player);
        if (!this.currentTarget) {
          // Check for crates first (high priority)
          this.currentTarget = this.targetingSystem.findBestLootTarget(this.player);
        }
        if (!this.currentTarget) {
          const exploredCells = this.explorationTracker.getExploredCells();
          this.currentTarget = this.targetingSystem.getExploreTarget(this.player, exploredCells);
        }
        break;

      case AIState.RETREAT:
        this.currentTarget = this.targetingSystem.findSafeRetreatPosition(this.player);
        break;

      case AIState.EXPLORE:
        // Check for special biomes first if we don't have good weapons
        const exploreInventory = this.player.getInventory();
        const exploreHasGoodWeapon = this.targetingSystem.hasGoodWeapon(exploreInventory);
        if (!exploreHasGoodWeapon) {
          const exploredBiomes = this.explorationTracker.getExploredBiomes();
          const specialBiome = this.targetingSystem.findNearestSpecialBiome(
            this.player,
            exploredBiomes
          );
          if (specialBiome) {
            this.currentTarget = specialBiome;
            break;
          }
        }

        const exploredCells = this.explorationTracker.getExploredCells();
        this.currentTarget = this.targetingSystem.getExploreTarget(this.player, exploredCells);
        break;
    }
  }

  /**
   * Recalculate path to current target
   * Uses findWalkableWaypoint to find alternative paths if direct target is blocked
   */
  private recalculatePath(): void {
    const state = this.stateMachine.getCurrentState();
    const playerPos = this.player.getCenterPosition();

    // During combat, path directly to enemy
    if (state === AIState.ENGAGE && this.combatTarget) {
      const targetPos = this.combatTarget.entity?.hasExt(Positionable)
        ? this.combatTarget.entity.getExt(Positionable).getCenterPosition()
        : this.combatTarget.position;

      // Use findWalkableWaypoint to find alternative paths if blocked
      this.movementController.setCurrentWaypoint(this.findWalkableWaypoint(playerPos, targetPos));
      return;
    }

    // For other states, path to current target
    if (!this.currentTarget) {
      this.movementController.clearWaypoint();
      return;
    }

    let targetPos = this.currentTarget.position;
    if (this.currentTarget.entity?.hasExt(Positionable)) {
      targetPos = this.currentTarget.entity.getExt(Positionable).getCenterPosition();
    }

    // During retreat, don't constantly switch targets - only update if we're very close
    // This prevents bouncing between targets
    if (state === AIState.RETREAT && this.currentTarget.type === "position") {
      const distToTarget = distance(playerPos, targetPos);
      // Only find new target if we're very close (within waypoint threshold)
      // This prevents constant target switching
      if (distToTarget < AI_CONFIG.WAYPOINT_THRESHOLD) {
        // We've reached the retreat position - get a new one further away
        this.currentTarget = this.targetingSystem.findSafeRetreatPosition(this.player);
        targetPos = this.currentTarget.position;
      }
      // Don't switch to loot during retreat - focus on getting away first
    }

    // Use findWalkableWaypoint to find alternative paths if blocked
    this.movementController.setCurrentWaypoint(this.findWalkableWaypoint(playerPos, targetPos));
  }

  /**
   * Build context object for state handlers
   */
  private buildStateContext(): AIStateContext {
    return {
      player: this.player,
      gameManagers: this.gameManagers,
      stateMachine: this.stateMachine,
      targetingSystem: this.targetingSystem,
      pathfinder: this.pathfinder,
      explorationTracker: this.explorationTracker,
      currentTarget: this.currentTarget,
      combatTarget: this.combatTarget,
      currentWaypoint: this.movementController.getCurrentWaypoint(),
      enhancedThreatInfo: this.currentEnhancedThreatInfo,
      lastDecision: this.lastDecision,
      fireTimer: this.timerManager.fireTimer,
      interactTimer: this.timerManager.interactTimer,
      shouldSprint: (isUrgent: boolean) => this.shouldSprint(isUrgent),
      calculateAimAngle: (source: Vector2, target: Vector2) =>
        this.calculateAimAngle(source, target),
      angleToDirection: (angle: number) => this.angleToDirection(angle),
      findWalkableWaypoint: (playerPos: Vector2, targetPos: Vector2) =>
        this.findWalkableWaypoint(playerPos, targetPos),
      calculateRetreatPosition: (playerPos: Vector2, enemyPos: Vector2, dist: number) =>
        calculateRetreatPosition(playerPos, enemyPos, dist),
      moveTowardWaypoint: (input: Input, playerPos: Vector2) =>
        this.moveTowardWaypoint(input, playerPos),
      recalculatePath: () => this.recalculatePath(),
      setCurrentTarget: (target: AITarget | null) => {
        this.currentTarget = target;
      },
      setCurrentWaypoint: (waypoint: Vector2 | null) => {
        this.movementController.setCurrentWaypoint(waypoint);
      },
      setCombatTarget: (target: AITarget | null) => {
        this.combatTarget = target;
      },
      resetInteractTimer: () => {
        this.timerManager.interactTimer = 0;
      },
    };
  }

  /**
   * Check for opportunistic actions - crate destruction and item pickup
   * Returns true if an opportunistic action was taken
   */
  private checkOpportunisticActions(input: Input, playerPos: Vector2): boolean {
    const state = this.stateMachine.getCurrentState();

    // Don't do opportunistic actions during FLEE (toxic zone emergency) or RETREAT (healing)
    if (state === AIState.FLEE || state === AIState.RETREAT) {
      return false;
    }

    // Check for nearby crates to destroy first (higher priority)
    const opportunisticCrate = this.targetingSystem.findOpportunisticCrate(this.player);
    if (opportunisticCrate && opportunisticCrate.distance !== undefined) {
      // If we're close enough to attack the crate
      if (opportunisticCrate.distance <= AI_CONFIG.INTERACT_RADIUS) {
        // Equip knife or best melee weapon for crate destruction
        const inventory = this.player.getInventory();
        equipMeleeWeaponForCrate(this.player, inventory, this.stateMachine);

        // Attack the crate
        const targetPos = opportunisticCrate.position;
        aimAtTarget(input, playerPos, targetPos);
        input.fire = true;
        this.timerManager.fireTimer = 0;
        return true;
      }
      // If crate is nearby but not quite in range, move toward it
      else if (opportunisticCrate.distance <= AI_CONFIG.OPPORTUNISTIC_CRATE_RADIUS) {
        const waypoint = this.findWalkableWaypoint(playerPos, opportunisticCrate.position);
        if (waypoint) {
          const vel = velocityTowards(playerPos, waypoint);
          input.dx = vel.x;
          input.dy = vel.y;
          input.facing = this.determineFacing(vel);
          return true;
        }
      }
    }

    // Check for opportunistic item pickup
    const opportunisticItem = this.targetingSystem.findOpportunisticPickup(this.player);
    if (opportunisticItem && opportunisticItem.distance !== undefined) {
      // If we're close enough to pick up the item
      if (
        opportunisticItem.distance <= AI_CONFIG.INTERACT_RADIUS &&
        this.timerManager.interactTimer >= AI_CONFIG.INTERACT_COOLDOWN &&
        opportunisticItem.entity
      ) {
        // Use helper for pickup (handles inventory checks and debug logging)
        const result = AIInteractionHelper.tryPickupItem(
          this.player,
          opportunisticItem.entity,
          this.targetingSystem,
          "OPPORTUNISTIC"
        );
        if (result.success) {
          this.timerManager.interactTimer = 0;
          return true;
        }
        // If pickup failed (inventory full, can't stack, etc.), don't block other actions
        // Let the normal state behavior handle it - this prevents getting stuck
        return false;
      }
      // If item is nearby but not quite in range, move toward it
      // Only do this if the item is VERY close (within 50px) to not disrupt current task too much
      else if (opportunisticItem.distance <= 50) {
        const waypoint = this.findWalkableWaypoint(playerPos, opportunisticItem.position);
        if (waypoint) {
          const vel = velocityTowards(playerPos, waypoint);
          input.dx = vel.x;
          input.dy = vel.y;
          input.facing = this.determineFacing(vel);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generate input based on current state
   */
  private generateInput(): Input {
    const input: Input = {
      facing: Direction.Right,
      dx: 0,
      dy: 0,
      fire: false,
      sprint: false,
      aimAngle: undefined,
    };

    const state = this.stateMachine.getCurrentState();
    const playerPos = this.player.getCenterPosition();

    // FLEE state: Skip ALL combat checks - pure escape, no fighting
    if (state === AIState.FLEE) {
      // Build context for state handlers
      const context = this.buildStateContext();
      // Only handle flee behavior - no melee attacks, no opportunistic actions
      this.fleeHandler.handle(input, playerPos, context);
      this.smoothMovement(input);
      return input;
    }

    // CRITICAL: Always check for enemies in melee range and attack them immediately
    // This prevents AI from ignoring enemies when stuck on top of each other
    if (this.checkAndAttackMeleeRangeEnemies(input, playerPos)) {
      // Found and attacked an enemy in melee range - skip normal state behavior
      this.smoothMovement(input);
      return input;
    }

    // Check for opportunistic crate destruction and item pickup (in non-combat states)
    // Do this BEFORE normal state behavior to prioritize nearby valuable items
    if (state !== AIState.ENGAGE && this.checkOpportunisticActions(input, playerPos)) {
      this.smoothMovement(input);
      return input;
    }

    // Build context for state handlers
    const context = this.buildStateContext();

    // Handle each state using state handlers
    // Note: FLEE state is handled earlier in generateInput() to skip all combat checks
    switch (state) {
      case AIState.ENGAGE:
        this.engageHandler.handle(input, playerPos, context);
        break;

      case AIState.RETREAT:
        this.retreatHandler.handle(input, playerPos, context);
        break;

      case AIState.LOOT:
        this.lootHandler.handle(input, playerPos, context);
        break;

      case AIState.HUNT:
        this.huntHandler.handle(input, playerPos, context);
        break;

      case AIState.EXPLORE:
        this.exploreHandler.handle(input, playerPos, context);
        break;
    }

    // Smooth movement to avoid jerkiness
    this.smoothMovement(input);

    // FAILSAFE: If no movement and no fire action, ensure we don't get stuck
    // This handles edge cases where all targets are null and waypoint is null
    if (input.dx === 0 && input.dy === 0 && !input.fire) {
      // No movement generated - force exploration to avoid getting stuck
      if (!this.currentTarget) {
        this.currentTarget = this.targetingSystem.getExploreTarget(this.player);
      }
      // Trigger path recalculation
      const waypoint = this.movementController.getCurrentWaypoint();
      if (!waypoint && this.currentTarget) {
        const newWaypoint = this.pathfinder.pathTowardsAvoidingToxic(
          playerPos,
          this.currentTarget.position
        );
        this.movementController.setCurrentWaypoint(newWaypoint);
      }
      // If we now have a waypoint, move toward it
      const currentWaypoint = this.movementController.getCurrentWaypoint();
      if (currentWaypoint) {
        const velocity = velocityTowards(playerPos, currentWaypoint);
        input.dx = velocity.x;
        input.dy = velocity.y;
      }
    }

    return input;
  }

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
  private findWalkableWaypoint(playerPos: Vector2, targetPos: Vector2): Vector2 | null {
    // First try direct pathfinding
    let waypoint = this.pathfinder.pathTowardsAvoidingToxic(playerPos, targetPos);
    if (waypoint) {
      return waypoint;
    }

    // If direct path fails, try nearby positions in a spiral pattern
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const searchRadius = 3; // Search up to 3 tiles away

    // Try positions in expanding circles
    for (let radius = 1; radius <= searchRadius; radius++) {
      // Try 8 directions (N, NE, E, SE, S, SW, W, NW)
      const angles = [
        0,
        Math.PI / 4,
        Math.PI / 2,
        (3 * Math.PI) / 4,
        Math.PI,
        (5 * Math.PI) / 4,
        (3 * Math.PI) / 2,
        (7 * Math.PI) / 4,
      ];

      for (const angle of angles) {
        const offsetX = Math.cos(angle) * radius * TILE_SIZE;
        const offsetY = Math.sin(angle) * radius * TILE_SIZE;
        const alternativeTarget = new Vector2(targetPos.x + offsetX, targetPos.y + offsetY);

        waypoint = this.pathfinder.pathTowardsAvoidingToxic(playerPos, alternativeTarget);
        if (waypoint) {
          return waypoint;
        }
      }
    }

    // If still no path found, return null (don't move toward fixed points)
    // The AI will find a new target on next update
    return null;
  }

  /**
   * Handle melee combat with kiting
   * Uses pathfinding to navigate around obstacles
   * Includes disengage and escape behaviors
   */
  private handleMeleeCombat(
    input: Input,
    playerPos: Vector2,
    enemyPos: Vector2,
    dist: number
  ): void {
    const healthPercent = this.player.getHealth() / this.player.getMaxHealth();
    const kitePhase = this.stateMachine.getKitePhase();
    const kiteTimer = this.stateMachine.getKiteTimer();

    // Get actual melee weapon attack range
    const activeItem = this.player.activeItem;
    const actualMeleeRange = getMeleeAttackRange(activeItem || undefined);
    const meleeRangeWithBuffer = getMeleeRangeWithBuffer(activeItem || undefined);

    // ESCAPE CHECK: Very low health - flee completely, no melee fighting
    if (healthPercent < AI_CONFIG.ESCAPE_HEALTH_THRESHOLD) {
      if (!this.stateMachine.getIsEscaping()) {
        this.stateMachine.startEscape();
      }
      this.handleEscapeBehavior(input, playerPos, enemyPos);
      return;
    } else {
      // Health recovered, can stop escaping
      if (this.stateMachine.getIsEscaping() && this.stateMachine.isEscapeComplete()) {
        this.stateMachine.resetEscape();
      }
    }

    // DISENGAGE CHECK: After several kite cycles, run away to gather supplies
    if (kitePhase === KitePhase.RETREAT && this.stateMachine.shouldDisengage()) {
      this.stateMachine.startDisengage();
    }

    // Handle disengage state
    if (kitePhase === KitePhase.DISENGAGE) {
      this.handleDisengageBehavior(input, playerPos, enemyPos, dist);
      return;
    }

    switch (kitePhase) {
      case KitePhase.APPROACH:
        // Only transition to attack if we're actually within melee range
        if (dist <= meleeRangeWithBuffer) {
          // Close enough to attack
          this.stateMachine.setKitePhase(KitePhase.ATTACK);
        } else {
          // Use pathfinding to move toward enemy
          const waypoint = this.movementController.getCurrentWaypoint();
          if (waypoint) {
            const vel = velocityTowards(playerPos, waypoint);
            input.dx = vel.x;
            input.dy = vel.y;
          } else {
            // Fallback to direct movement if no path
            const towardVel = velocityTowards(playerPos, enemyPos);
            input.dx = towardVel.x;
            input.dy = towardVel.y;
          }
          // Sprint to approach enemy in melee (urgent)
          input.sprint = this.shouldSprint(true);
        }
        break;

      case KitePhase.ATTACK:
        // CRITICAL: Only attack if STILL within actual melee range!
        // Use strict range check (actual range, not buffer) to prevent swinging when out of range
        if (dist <= actualMeleeRange) {
          if (this.timerManager.fireTimer >= AI_CONFIG.FIRE_RATE_DELAY) {
            input.fire = true;
            this.timerManager.fireTimer = 0;
          }
          // Stay in place briefly while attacking
          input.dx = 0;
          input.dy = 0;
        } else {
          // Enemy moved away - go back to approach immediately
          this.stateMachine.setKitePhase(KitePhase.APPROACH);
          break;
        }

        // After attack duration, retreat
        if (kiteTimer >= AI_CONFIG.KITE_ATTACK_DURATION) {
          this.stateMachine.setKitePhase(KitePhase.RETREAT);
        }
        break;

      case KitePhase.RETREAT:
        // Use pathfinding to retreat away from enemy
        const retreatTarget = calculateRetreatPosition(
          playerPos,
          enemyPos,
          AI_CONFIG.KITE_SAFE_DISTANCE
        );
        // Always use pathfinding - find walkable waypoint
        const retreatWaypoint = this.findWalkableWaypoint(playerPos, retreatTarget);

        if (retreatWaypoint) {
          const vel = velocityTowards(playerPos, retreatWaypoint);
          input.dx = vel.x;
          input.dy = vel.y;
        } else {
          // If no path found, try current waypoint or recalculate
          const waypoint = this.movementController.getCurrentWaypoint();
          if (waypoint) {
            const vel = velocityTowards(playerPos, waypoint);
            input.dx = vel.x;
            input.dy = vel.y;
          } else {
            this.recalculatePath();
            const waypoint = this.movementController.getCurrentWaypoint();
            if (waypoint) {
              const vel = velocityTowards(playerPos, waypoint);
              input.dx = vel.x;
              input.dy = vel.y;
            }
            // If still no waypoint, don't move (better than running into trees)
          }
        }
        // Sprint to retreat from melee danger (urgent)
        input.sprint = this.shouldSprint(true);

        // After retreat duration or safe distance, check for disengage or approach again
        if (kiteTimer >= AI_CONFIG.KITE_RETREAT_DURATION || dist >= AI_CONFIG.KITE_SAFE_DISTANCE) {
          this.stateMachine.setKitePhase(KitePhase.APPROACH);
        }
        break;
    }
  }

  /**
   * Handle escape behavior - flee completely when very low health
   * Uses safestRetreatDirection from enhanced threat info to avoid ALL threats
   */
  private handleEscapeBehavior(input: Input, playerPos: Vector2, enemyPos: Vector2): void {
    // Check if escape is complete - transition out
    if (this.stateMachine.isEscapeComplete()) {
      this.stateMachine.resetEscape();
      // Clear targets to force re-evaluation
      this.combatTarget = null;
      this.currentTarget = null;
      this.forceRetarget = true;
    }

    // Use the safest retreat direction which considers ALL threats (zombies + players)
    const safestDir = this.currentEnhancedThreatInfo?.safestRetreatDirection;

    let escapeTarget: Vector2;
    if (safestDir) {
      // Use the pre-calculated safest direction (away from all threats)
      escapeTarget = new Vector2(playerPos.x + safestDir.x * 200, playerPos.y + safestDir.y * 200);
    } else {
      // Fallback to escaping from the single known enemy
      escapeTarget = calculateRetreatPosition(playerPos, enemyPos, 200);
    }

    // Always use pathfinding - find walkable waypoint
    const escapeWaypoint = this.findWalkableWaypoint(playerPos, escapeTarget);

    if (escapeWaypoint) {
      const vel = velocityTowards(playerPos, escapeWaypoint);
      input.dx = vel.x;
      input.dy = vel.y;
    } else {
      // If no path found at all, try to use waypoint from current target
      // This ensures we don't run blindly into obstacles
      const waypoint = this.movementController.getCurrentWaypoint();
      if (waypoint) {
        const vel = velocityTowards(playerPos, waypoint);
        input.dx = vel.x;
        input.dy = vel.y;
      } else {
        // Last resort: try to recalculate path to current target
        this.recalculatePath();
        const waypoint = this.movementController.getCurrentWaypoint();
        if (waypoint) {
          const vel = velocityTowards(playerPos, waypoint);
          input.dx = vel.x;
          input.dy = vel.y;
        }
        // If still no waypoint, don't move (better than running into trees)
      }
    }
    // Escape is life-or-death - always sprint even on low stamina
    input.sprint = true;

    // NO attacking during escape - pure flee
  }

  /**
   * Handle disengage behavior - run away to gather supplies
   * But if chased and enemy gets too close, fight back in defense
   * Uses safestRetreatDirection to avoid ALL threats
   */
  private handleDisengageBehavior(
    input: Input,
    playerPos: Vector2,
    enemyPos: Vector2,
    dist: number
  ): void {
    // CHASE DEFENSE: If ANY enemy is very close while disengaging, fight back
    // Check the enhanced threat info for immediate threats
    if (
      dist <= AI_CONFIG.IMMEDIATE_THREAT_RADIUS ||
      this.currentEnhancedThreatInfo?.hasImmediateThreat
    ) {
      // Enemy caught up - reset disengage and fight in defense
      this.stateMachine.resetDisengage();
      this.stateMachine.setKitePhase(KitePhase.APPROACH);
      return;
    }

    // Check if disengage period is complete
    if (this.stateMachine.isDisengageComplete()) {
      this.stateMachine.resetDisengage();
      this.stateMachine.setKitePhase(KitePhase.APPROACH);
      // Clear combat target so the decision engine will pick a new state (LOOT/HUNT/EXPLORE)
      this.combatTarget = null;
      // Force a new target search on next frame
      this.currentTarget = null;
      this.forceRetarget = true;
      return;
    }

    // Use the safest retreat direction which considers ALL threats
    const safestDir = this.currentEnhancedThreatInfo?.safestRetreatDirection;

    let disengageTarget: Vector2;
    if (safestDir) {
      disengageTarget = new Vector2(
        playerPos.x + safestDir.x * 150,
        playerPos.y + safestDir.y * 150
      );
    } else {
      disengageTarget = calculateRetreatPosition(playerPos, enemyPos, 150);
    }

    // Always use pathfinding - find walkable waypoint
    const disengageWaypoint = this.findWalkableWaypoint(playerPos, disengageTarget);

    if (disengageWaypoint) {
      const vel = velocityTowards(playerPos, disengageWaypoint);
      input.dx = vel.x;
      input.dy = vel.y;
    } else {
      // If no path found, try to use waypoint from current target
      const waypoint = this.movementController.getCurrentWaypoint();
      if (waypoint) {
        const vel = velocityTowards(playerPos, waypoint);
        input.dx = vel.x;
        input.dy = vel.y;
      } else {
        // Try to recalculate path
        this.recalculatePath();
        const waypoint = this.movementController.getCurrentWaypoint();
        if (waypoint) {
          const vel = velocityTowards(playerPos, waypoint);
          input.dx = vel.x;
          input.dy = vel.y;
        }
        // If still no waypoint, don't move (better than running into trees)
      }
    }
    // Disengage is semi-urgent - conserve some stamina
    input.sprint = this.shouldSprint(false);
  }

  /**
   * Handle kiting retreat - move away while still fighting
   * Uses pathfinding to navigate around obstacles
   */
  private handleKitingRetreat(
    input: Input,
    playerPos: Vector2,
    enemyPos: Vector2,
    dist: number
  ): void {
    // Get safest retreat direction from enhanced threat info
    const retreatDir = this.currentEnhancedThreatInfo?.safestRetreatDirection;

    // Calculate retreat target position using safest direction
    let retreatTarget: Vector2;
    if (retreatDir) {
      retreatTarget = new Vector2(
        playerPos.x + retreatDir.x * 150,
        playerPos.y + retreatDir.y * 150
      );
    } else {
      // Fallback: calculate retreat position away from enemy
      retreatTarget = calculateRetreatPosition(playerPos, enemyPos, 150);
    }

    // Always use pathfinding - find walkable waypoint
    const retreatWaypoint = this.findWalkableWaypoint(playerPos, retreatTarget);

    if (retreatWaypoint) {
      const vel = velocityTowards(playerPos, retreatWaypoint);
      input.dx = vel.x;
      input.dy = vel.y;
    } else {
      // If no path found, try current waypoint or recalculate
      const waypoint = this.movementController.getCurrentWaypoint();
      if (waypoint) {
        const vel = velocityTowards(playerPos, waypoint);
        input.dx = vel.x;
        input.dy = vel.y;
      } else {
        this.recalculatePath();
        const waypoint = this.movementController.getCurrentWaypoint();
        if (waypoint) {
          const vel = velocityTowards(playerPos, waypoint);
          input.dx = vel.x;
          input.dy = vel.y;
        }
        // If still no waypoint, don't move (better than running into trees)
      }
    }

    // Kiting retreat is urgent - we're in combat danger
    input.sprint = this.shouldSprint(true);

    // Fire at enemy while retreating
    const inventory = this.player.getInventory();
    const hasRanged = this.stateMachine.hasRangedWeaponWithAmmo(inventory);

    if (hasRanged) {
      // Ranged: shoot while moving
      const activeItem = this.player.activeItem;
      const weaponType = activeItem?.itemType || "pistol";
      const effectiveRange = getEffectiveShootingRange(weaponType);

      if (dist <= effectiveRange && this.timerManager.fireTimer >= AI_CONFIG.FIRE_RATE_DELAY) {
        const inaccuracy = (Math.random() - 0.5) * AI_CONFIG.SHOOTING_INACCURACY * 1.5; // More inaccurate while moving
        input.aimAngle = this.calculateAimAngle(playerPos, enemyPos) + inaccuracy;
        input.fire = true;
        this.timerManager.fireTimer = 0;
      }
    } else {
      // Melee: only attack if very close (use actual weapon range)
      const activeItem = this.player.activeItem;
      const actualMeleeRange = getMeleeAttackRange(activeItem || undefined);

      if (dist <= actualMeleeRange && this.timerManager.fireTimer >= AI_CONFIG.FIRE_RATE_DELAY) {
        input.fire = true;
        this.timerManager.fireTimer = 0;
      }
    }
  }

  /**
   * Handle RETREAT state - flee and heal
   * Uses safest retreat direction to avoid all threats
   * ALWAYS uses pathfinding - never moves directly without a valid path
   * Actively seeks bandages while retreating to heal up
   */
  private handleRetreatBehavior(input: Input, playerPos: Vector2): void {
    // During retreat, prioritize finding bandages to heal
    // But also keep moving away from threats

    // First, check if we already have a bandage - if so, just use it while retreating
    const inventory = this.player.getInventory();
    const hasBandage = inventory.some((item) => item && item.itemType === "bandage");

    // If we don't have a bandage, actively look for one
    if (!hasBandage) {
      const bandageTarget = this.targetingSystem.findNearestBandage(this.player);

      // Go for bandage if it's within pickup radius
      if (
        bandageTarget &&
        bandageTarget.distance &&
        bandageTarget.distance < AI_CONFIG.RETREAT_PICKUP_RADIUS
      ) {
        // Check if close enough to pick up RIGHT NOW
        if (
          bandageTarget.distance <= AI_CONFIG.INTERACT_RADIUS &&
          this.timerManager.interactTimer >= AI_CONFIG.INTERACT_COOLDOWN &&
          bandageTarget.entity
        ) {
          this.timerManager.interactTimer = 0;
          if (
            !bandageTarget.entity.isMarkedForRemoval() &&
            bandageTarget.entity.hasExt(Interactive)
          ) {
            bandageTarget.entity.getExt(Interactive).interact(this.player.getId());
            this.currentTarget = null;
          }
        } else {
          // Not close enough - pathfind to the bandage
          // Only switch target if we don't already have this bandage as target
          if (
            !this.currentTarget ||
            this.currentTarget.type !== "item" ||
            this.currentTarget.entity?.getId() !== bandageTarget.entity?.getId()
          ) {
            this.currentTarget = bandageTarget;
            this.movementController.clearWaypoint();
            this.recalculatePath();
          }

          // Move toward bandage using pathfinding
          const waypoint = this.movementController.getCurrentWaypoint();
          if (waypoint) {
            const vel = velocityTowards(playerPos, waypoint);
            input.dx = vel.x;
            input.dy = vel.y;
          } else {
            // Recalculate path if no waypoint
            this.recalculatePath();
            const waypoint = this.movementController.getCurrentWaypoint();
            if (waypoint) {
              const vel = velocityTowards(playerPos, waypoint);
              input.dx = vel.x;
              input.dy = vel.y;
            } else {
              // Fallback: direct path to bandage (only if pathfinding fails)
              const vel = velocityTowards(playerPos, bandageTarget.position);
              input.dx = vel.x;
              input.dy = vel.y;
            }
          }

          // Sprint to get bandage quickly
          input.sprint = this.shouldSprint(true);

          // Try to use any bandage we already have while moving
          const activeItem = this.player.activeItem;
          if (activeItem?.itemType === "bandage") {
            input.fire = true;
          }
          return;
        }
      }
    }

    // No bandage to find, or already have one - focus on retreating
    // Try to move toward waypoint first (which should be safe retreat position)
    const movedToWaypoint = this.moveTowardWaypoint(input, playerPos);

    // If no waypoint movement (reached or null), find a new retreat direction
    if (!movedToWaypoint) {
      // Get a new safe retreat position (away from all threats)
      this.currentTarget = this.targetingSystem.findSafeRetreatPosition(this.player);
      this.movementController.clearWaypoint();
      this.recalculatePath();

      // If we still have no waypoint after recalculation, find immediate movement direction
      if (!this.movementController.getCurrentWaypoint()) {
        const safestDir = this.currentEnhancedThreatInfo?.safestRetreatDirection;
        if (safestDir) {
          // Calculate retreat target away from threats
          const retreatTarget = new Vector2(
            playerPos.x + safestDir.x * 300, // Longer retreat distance
            playerPos.y + safestDir.y * 300
          );
          // Always use pathfinding - find walkable waypoint
          const retreatWaypoint = this.findWalkableWaypoint(playerPos, retreatTarget);
          if (retreatWaypoint) {
            this.movementController.setCurrentWaypoint(retreatWaypoint);
            // Update current target to match the waypoint direction
            this.currentTarget = {
              type: "position",
              position: retreatTarget,
              priority: AI_CONFIG.PRIORITY_HEALTH_URGENT,
            };
            const vel = velocityTowards(playerPos, retreatWaypoint);
            input.dx = vel.x;
            input.dy = vel.y;
          } else {
            // Try random directions until we find a valid path
            this.findRandomWalkableDirection(input, playerPos);
          }
        } else {
          // No threat info - find a random walkable direction away from current position
          this.findRandomWalkableDirection(input, playerPos);
        }
      } else {
        // We got a waypoint from recalculation - use it
        const waypoint = this.movementController.getCurrentWaypoint();
        if (!waypoint) return;
        const vel = velocityTowards(playerPos, waypoint);
        input.dx = vel.x;
        input.dy = vel.y;
      }
    }

    // Retreat to heal is urgent - low health
    input.sprint = this.shouldSprint(true);

    // Try to use bandage if we have one
    const activeItem = this.player.activeItem;
    if (activeItem?.itemType === "bandage") {
      input.fire = true;
    }
  }

  /**
   * Find a random walkable direction and set movement
   * Used as fallback when no waypoint is available
   */
  private findRandomWalkableDirection(input: Input, playerPos: Vector2): void {
    // Try multiple random directions until we find one with a valid path
    for (let attempt = 0; attempt < 12; attempt++) {
      const randomAngle = Math.random() * Math.PI * 2;
      const randomTarget = new Vector2(
        playerPos.x + Math.cos(randomAngle) * 200,
        playerPos.y + Math.sin(randomAngle) * 200
      );

      // Always use pathfinding - find walkable waypoint
      const randomWaypoint = this.findWalkableWaypoint(playerPos, randomTarget);
      if (randomWaypoint) {
        this.movementController.setCurrentWaypoint(randomWaypoint);
        const vel = velocityTowards(playerPos, randomWaypoint);
        input.dx = vel.x;
        input.dy = vel.y;
        return;
      }
    }

    // If no valid path found, still try to move in a random direction
    // This prevents complete stopping - better than standing still
    const randomAngle = Math.random() * Math.PI * 2;
    const vel = velocityTowards(
      playerPos,
      new Vector2(
        playerPos.x + Math.cos(randomAngle) * 100,
        playerPos.y + Math.sin(randomAngle) * 100
      )
    );
    input.dx = vel.x * 0.5; // Slower movement when pathfinding fails
    input.dy = vel.y * 0.5;
  }

  /**
   * Handle LOOT state - collect items
   */
  private handleLootBehavior(input: Input, playerPos: Vector2): void {
    if (!this.currentTarget) {
      this.moveTowardWaypoint(input, playerPos);
      return;
    }

    const targetPos = this.currentTarget.position;
    const dist = distance(playerPos, targetPos);

    // If we're within interaction range, stop moving and wait for cooldown
    if (dist <= AI_CONFIG.INTERACT_RADIUS) {
      // Stop moving - we're close enough, just wait for cooldown
      input.dx = 0;
      input.dy = 0;

      // Check if cooldown is ready to interact
      if (this.timerManager.interactTimer >= AI_CONFIG.INTERACT_COOLDOWN) {
        this.timerManager.interactTimer = 0;

        // Verify entity still exists and hasn't been removed
        if (this.currentTarget.entity && this.currentTarget.entity.isMarkedForRemoval()) {
          this.currentTarget = null;
          return;
        }

        if (this.currentTarget.type === "crate") {
          // Attack crate to break it - prioritize using knife
          const inventory = this.player.getInventory();
          equipMeleeWeaponForCrate(this.player, inventory, this.stateMachine);

          aimAtTarget(input, playerPos, targetPos);
          input.fire = true;
        } else if (this.currentTarget.type === "barrel") {
          // Search barrel using helper
          AIInteractionHelper.tryInteractWithBarrel(this.player, this.currentTarget.entity);
          this.currentTarget = null;
        } else if (this.currentTarget.type === "item") {
          // Pick up item using helper
          AIInteractionHelper.tryPickupItem(
            this.player,
            this.currentTarget.entity,
            this.targetingSystem,
            "LOOT_LEGACY"
          );
          this.currentTarget = null;
        }
      }

      // Stop moving when in range (waiting for cooldown or just interacted)
      return;
    }

    // Only move if we're NOT within interaction range
    this.moveTowardWaypoint(input, playerPos);
  }

  /**
   * Handle HUNT state - search for players and attack
   */
  private handleHuntBehavior(input: Input, playerPos: Vector2): void {
    // If we have a player target in range, shoot at them
    if (this.currentTarget?.type === "player" && this.currentTarget.entity) {
      const enemy = this.currentTarget.entity;
      if (enemy.hasExt(Positionable)) {
        const enemyPos = enemy.getExt(Positionable).getCenterPosition();
        const dist = distance(playerPos, enemyPos);

        // Get weapon range
        const activeItem = this.player.activeItem;
        const weaponType = activeItem?.itemType || "pistol";
        const effectiveRange = getEffectiveShootingRange(weaponType);

        // Always aim at target
        const aimAngle = calculateAimAngle(playerPos, enemyPos);
        aimAtTarget(input, playerPos, enemyPos);

        if (dist <= effectiveRange) {
          // In range - shoot
          if (this.timerManager.fireTimer >= AI_CONFIG.FIRE_RATE_DELAY) {
            const inaccuracy = (Math.random() - 0.5) * AI_CONFIG.SHOOTING_INACCURACY;
            input.aimAngle = aimAngle + inaccuracy;
            input.fire = true;
            this.timerManager.fireTimer = 0;
          }

          // Stop to shoot if close enough
          if (dist <= AI_CONFIG.STOP_DISTANCE_FOR_SHOOTING) {
            return; // Don't move, just shoot
          }
        }
      }
    }

    // Move toward target/waypoint
    this.moveTowardWaypoint(input, playerPos);
    // Hunting is not urgent - conserve stamina for combat
    input.sprint = this.shouldSprint(false);
  }

  /**
   * Handle EXPLORE state - wander around
   */
  private handleExploreBehavior(input: Input, playerPos: Vector2): void {
    this.moveTowardWaypoint(input, playerPos);
    // Walk, don't sprint while exploring
  }

  /**
   * Move toward current waypoint
   * Returns true if movement was generated, false if waypoint was null or reached
   */
  private moveTowardWaypoint(input: Input, playerPos: Vector2): boolean {
    const waypoint = this.movementController.getCurrentWaypoint();
    if (!waypoint) return false;

    const dist = distance(playerPos, waypoint);

    // Check if we've reached the waypoint
    if (dist < AI_CONFIG.WAYPOINT_THRESHOLD) {
      this.movementController.clearWaypoint();
      // Immediately trigger path recalculation to avoid stopping
      this.recalculatePath();
      // If we got a new waypoint, move toward it this frame
      const newWaypoint = this.movementController.getCurrentWaypoint();
      if (newWaypoint) {
        const velocity = velocityTowards(playerPos, newWaypoint);
        input.dx = velocity.x;
        input.dy = velocity.y;
        input.facing = this.determineFacing(velocity);
        return true;
      }
      return false;
    }

    const velocity = velocityTowards(playerPos, waypoint);
    input.dx = velocity.x;
    input.dy = velocity.y;
    input.facing = this.determineFacing(velocity);
    return true;
  }

  /**
   * Smooth movement to prevent jerky changes
   */
  private smoothMovement(input: Input): void {
    this.movementController.smoothMovement(input, 0.4);
  }

  /**
   * Calculate aim angle from source to target
   */
  private calculateAimAngle(source: Vector2, target: Vector2): number {
    return calculateAimAngle(source, target);
  }

  /**
   * Determine facing direction from velocity
   */
  private determineFacing(velocity: Vector2): Direction {
    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      return velocity.x > 0 ? Direction.Right : Direction.Left;
    } else {
      return velocity.y > 0 ? Direction.Down : Direction.Up;
    }
  }

  /**
   * Convert angle to direction
   */
  private angleToDirection(angle: number): Direction {
    return angleToDirection(angle);
  }
}
