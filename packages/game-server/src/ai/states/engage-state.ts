import { Input } from "@shared/util/input";
import Vector2 from "@shared/util/vector2";
import { distance, velocityTowards } from "@shared/util/physics";
import { AIStateHandler, AIStateContext } from "./base-state";
import { AI_CONFIG } from "../ai-config";
import { AIDecision } from "../ai-decision-engine";
import { KitePhase } from "../ai-state-machine";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import { Player } from "@/entities/players/player";
import {
  getEffectiveShootingRange,
  getMeleeAttackRange,
  getMeleeRangeWithBuffer,
  calculateRetreatPosition,
  aimAtTarget,
  aimAtTargetWithInaccuracy,
} from "../ai-utils";

/**
 * ENGAGE state handler - combat with any enemy (zombie or player)
 */
export class EngageStateHandler implements AIStateHandler {
  handle(input: Input, playerPos: Vector2, context: AIStateContext): void {
    const { combatTarget, lastDecision, stateMachine, player } = context;

    if (!combatTarget || !combatTarget.entity) {
      // No target - try to find one or transition out of engage state
      context.setCombatTarget(null);
      if (context.currentWaypoint) {
        context.moveTowardWaypoint(input, playerPos);
      } else {
        // No waypoint either - look for any nearby loot or explore target
        if (!context.currentTarget) {
          context.setCurrentTarget(context.targetingSystem.findBestLootTarget(context.player));
        }
        if (!context.currentTarget) {
          const exploredCells = context.explorationTracker.getExploredCells();
          context.setCurrentTarget(
            context.targetingSystem.getExploreTarget(context.player, exploredCells)
          );
        }
        if (context.currentTarget) {
          context.recalculatePath();
        }
      }
      return;
    }

    const enemy = combatTarget.entity;

    // Check if target is dead - clear target and find new one
    const isTargetDead = enemy instanceof Player
      ? enemy.isDead()
      : (enemy.hasExt(Destructible) && enemy.getExt(Destructible).isDead());

    if (isTargetDead) {
      context.setCombatTarget(null);
      return;
    }

    if (!enemy.hasExt(Positionable)) return;

    const enemyPos = enemy.getExt(Positionable).getCenterPosition();
    const dist = distance(playerPos, enemyPos);

    // Check if we should ESCAPE (very low health - flee completely)
    const shouldEscape = lastDecision && lastDecision.decision === AIDecision.ESCAPE;

    if (shouldEscape) {
      this.handleEscapeBehavior(input, playerPos, enemyPos, context);
      return;
    }

    // Always aim at enemy
    aimAtTarget(input, playerPos, enemyPos);

    // Check if we should kite retreat (RETREAT_AND_FIGHT decision)
    const shouldKiteRetreat =
      lastDecision && lastDecision.decision === AIDecision.RETREAT_AND_FIGHT;

    if (shouldKiteRetreat) {
      this.handleKitingRetreat(input, playerPos, enemyPos, dist, context);
      return;
    }

    // Check if we have ranged weapon with ammo
    const inventory = player.getInventory();
    const hasRanged = stateMachine.hasRangedWeaponWithAmmo(inventory);

    if (hasRanged) {
      // Ranged combat
      this.handleRangedCombat(input, playerPos, enemyPos, dist, context);
    } else {
      // Melee combat (kiting)
      this.handleMeleeCombat(input, playerPos, enemyPos, dist, context);
    }
  }

  /**
   * Handle ranged combat - shoot from distance
   */
  private handleRangedCombat(
    input: Input,
    playerPos: Vector2,
    enemyPos: Vector2,
    dist: number,
    context: AIStateContext
  ): void {
    const activeItem = context.player.activeItem;
    const weaponType = activeItem?.itemType || "pistol";
    const effectiveRange = getEffectiveShootingRange(weaponType);

    if (dist <= effectiveRange) {
      // In range - shoot
      if (context.fireTimer >= AI_CONFIG.FIRE_RATE_DELAY) {
        aimAtTargetWithInaccuracy(input, playerPos, enemyPos, AI_CONFIG.SHOOTING_INACCURACY);
        input.fire = true;
      }

      // Maintain distance - back up if too close
      if (dist < AI_CONFIG.STOP_DISTANCE_FOR_SHOOTING) {
        const retreatTarget = calculateRetreatPosition(playerPos, enemyPos, 100);
        const retreatWaypoint = context.findWalkableWaypoint(playerPos, retreatTarget);

        if (retreatWaypoint) {
          const vel = velocityTowards(playerPos, retreatWaypoint);
          input.dx = vel.x * 0.5;
          input.dy = vel.y * 0.5;
        } else if (context.currentWaypoint) {
          const vel = velocityTowards(playerPos, context.currentWaypoint);
          input.dx = vel.x * 0.5;
          input.dy = vel.y * 0.5;
        }
      }
    } else {
      // Out of range - move closer using pathfinding
      if (context.currentWaypoint) {
        const vel = velocityTowards(playerPos, context.currentWaypoint);
        input.dx = vel.x;
        input.dy = vel.y;
      } else {
        // No waypoint - recalculate path using A* pathfinding
        const waypoint = context.findWalkableWaypoint(playerPos, enemyPos);
        if (waypoint) {
          context.setCurrentWaypoint(waypoint);
          const vel = velocityTowards(playerPos, waypoint);
          input.dx = vel.x;
          input.dy = vel.y;
        }
        // If pathfinding fails, don't move - better than walking into obstacles
      }
      input.sprint = context.shouldSprint(true);
    }
  }

  /**
   * Handle melee combat with kiting
   */
  private handleMeleeCombat(
    input: Input,
    playerPos: Vector2,
    enemyPos: Vector2,
    dist: number,
    context: AIStateContext
  ): void {
    const healthPercent = context.player.getHealth() / context.player.getMaxHealth();
    const kitePhase = context.stateMachine.getKitePhase();
    const kiteTimer = context.stateMachine.getKiteTimer();

    // Get actual melee weapon attack range
    const activeItem = context.player.activeItem;
    const actualMeleeRange = getMeleeAttackRange(activeItem || undefined);
    const meleeRangeWithBuffer = getMeleeRangeWithBuffer(activeItem || undefined);

    // ESCAPE CHECK: Very low health - flee completely
    if (healthPercent < AI_CONFIG.ESCAPE_HEALTH_THRESHOLD) {
      if (!context.stateMachine.getIsEscaping()) {
        context.stateMachine.startEscape();
      }
      this.handleEscapeBehavior(input, playerPos, enemyPos, context);
      return;
    } else {
      if (context.stateMachine.getIsEscaping() && context.stateMachine.isEscapeComplete()) {
        context.stateMachine.resetEscape();
      }
    }

    // DISENGAGE CHECK: After several kite cycles, run away to gather supplies
    if (kitePhase === KitePhase.RETREAT && context.stateMachine.shouldDisengage()) {
      context.stateMachine.startDisengage();
    }

    // Handle disengage state
    if (kitePhase === KitePhase.DISENGAGE) {
      this.handleDisengageBehavior(input, playerPos, enemyPos, dist, context);
      return;
    }

    switch (kitePhase) {
      case KitePhase.APPROACH:
        if (dist <= meleeRangeWithBuffer) {
          context.stateMachine.setKitePhase(KitePhase.ATTACK);
        } else {
          // Move closer using A* pathfinding
          if (context.currentWaypoint) {
            const vel = velocityTowards(playerPos, context.currentWaypoint);
            input.dx = vel.x;
            input.dy = vel.y;
          } else {
            // No waypoint - recalculate path using A* pathfinding
            const waypoint = context.findWalkableWaypoint(playerPos, enemyPos);
            if (waypoint) {
              context.setCurrentWaypoint(waypoint);
              const vel = velocityTowards(playerPos, waypoint);
              input.dx = vel.x;
              input.dy = vel.y;
            }
            // If pathfinding fails, don't move - better than walking into obstacles
          }
          input.sprint = context.shouldSprint(true);
        }
        break;

      case KitePhase.ATTACK:
        if (dist <= actualMeleeRange) {
          if (context.fireTimer >= AI_CONFIG.FIRE_RATE_DELAY) {
            input.fire = true;
          }
          input.dx = 0;
          input.dy = 0;
        } else {
          context.stateMachine.setKitePhase(KitePhase.APPROACH);
          break;
        }

        if (kiteTimer >= AI_CONFIG.KITE_ATTACK_DURATION) {
          context.stateMachine.setKitePhase(KitePhase.RETREAT);
        }
        break;

      case KitePhase.RETREAT:
        const retreatTarget = calculateRetreatPosition(
          playerPos,
          enemyPos,
          AI_CONFIG.KITE_SAFE_DISTANCE
        );
        const retreatWaypoint = context.findWalkableWaypoint(playerPos, retreatTarget);

        if (retreatWaypoint) {
          const vel = velocityTowards(playerPos, retreatWaypoint);
          input.dx = vel.x;
          input.dy = vel.y;
        } else if (context.currentWaypoint) {
          const vel = velocityTowards(playerPos, context.currentWaypoint);
          input.dx = vel.x;
          input.dy = vel.y;
        } else {
          context.recalculatePath();
          if (context.currentWaypoint) {
            const vel = velocityTowards(playerPos, context.currentWaypoint);
            input.dx = vel.x;
            input.dy = vel.y;
          }
        }
        input.sprint = context.shouldSprint(true);

        if (kiteTimer >= AI_CONFIG.KITE_RETREAT_DURATION || dist >= AI_CONFIG.KITE_SAFE_DISTANCE) {
          context.stateMachine.setKitePhase(KitePhase.APPROACH);
        }
        break;
    }
  }

  /**
   * Handle escape behavior - flee completely when very low health
   */
  private handleEscapeBehavior(
    input: Input,
    playerPos: Vector2,
    enemyPos: Vector2,
    context: AIStateContext
  ): void {
    if (context.stateMachine.isEscapeComplete()) {
      context.stateMachine.resetEscape();
      context.setCombatTarget(null);
      context.setCurrentTarget(null);
    }

    const safestDir = context.enhancedThreatInfo?.safestRetreatDirection;

    let escapeTarget: Vector2;
    if (safestDir) {
      escapeTarget = new Vector2(playerPos.x + safestDir.x * 200, playerPos.y + safestDir.y * 200);
    } else {
      escapeTarget = calculateRetreatPosition(playerPos, enemyPos, 200);
    }

    const escapeWaypoint = context.findWalkableWaypoint(playerPos, escapeTarget);

    if (escapeWaypoint) {
      const vel = velocityTowards(playerPos, escapeWaypoint);
      input.dx = vel.x;
      input.dy = vel.y;
    } else if (context.currentWaypoint) {
      const vel = velocityTowards(playerPos, context.currentWaypoint);
      input.dx = vel.x;
      input.dy = vel.y;
    } else {
      context.recalculatePath();
      if (context.currentWaypoint) {
        const vel = velocityTowards(playerPos, context.currentWaypoint);
        input.dx = vel.x;
        input.dy = vel.y;
      }
    }
    input.sprint = true;
  }

  /**
   * Handle disengage behavior - run away to gather supplies
   */
  private handleDisengageBehavior(
    input: Input,
    playerPos: Vector2,
    enemyPos: Vector2,
    dist: number,
    context: AIStateContext
  ): void {
    if (
      dist <= AI_CONFIG.IMMEDIATE_THREAT_RADIUS ||
      context.enhancedThreatInfo?.hasImmediateThreat
    ) {
      context.stateMachine.resetDisengage();
      context.stateMachine.setKitePhase(KitePhase.APPROACH);
      return;
    }

    if (context.stateMachine.isDisengageComplete()) {
      context.stateMachine.resetDisengage();
      context.stateMachine.setKitePhase(KitePhase.APPROACH);
      context.setCombatTarget(null);
      context.setCurrentTarget(null);
      return;
    }

    const safestDir = context.enhancedThreatInfo?.safestRetreatDirection;

    let disengageTarget: Vector2;
    if (safestDir) {
      disengageTarget = new Vector2(
        playerPos.x + safestDir.x * 150,
        playerPos.y + safestDir.y * 150
      );
    } else {
      disengageTarget = calculateRetreatPosition(playerPos, enemyPos, 150);
    }

    const disengageWaypoint = context.findWalkableWaypoint(playerPos, disengageTarget);

    if (disengageWaypoint) {
      const vel = velocityTowards(playerPos, disengageWaypoint);
      input.dx = vel.x;
      input.dy = vel.y;
    } else if (context.currentWaypoint) {
      const vel = velocityTowards(playerPos, context.currentWaypoint);
      input.dx = vel.x;
      input.dy = vel.y;
    } else {
      context.recalculatePath();
      if (context.currentWaypoint) {
        const vel = velocityTowards(playerPos, context.currentWaypoint);
        input.dx = vel.x;
        input.dy = vel.y;
      }
    }
    input.sprint = context.shouldSprint(false);
  }

  /**
   * Handle kiting retreat - move away while still fighting
   */
  private handleKitingRetreat(
    input: Input,
    playerPos: Vector2,
    enemyPos: Vector2,
    dist: number,
    context: AIStateContext
  ): void {
    const retreatDir = context.enhancedThreatInfo?.safestRetreatDirection;

    let retreatTarget: Vector2;
    if (retreatDir) {
      retreatTarget = new Vector2(
        playerPos.x + retreatDir.x * 150,
        playerPos.y + retreatDir.y * 150
      );
    } else {
      retreatTarget = calculateRetreatPosition(playerPos, enemyPos, 150);
    }

    const retreatWaypoint = context.findWalkableWaypoint(playerPos, retreatTarget);

    if (retreatWaypoint) {
      const vel = velocityTowards(playerPos, retreatWaypoint);
      input.dx = vel.x;
      input.dy = vel.y;
    } else if (context.currentWaypoint) {
      const vel = velocityTowards(playerPos, context.currentWaypoint);
      input.dx = vel.x;
      input.dy = vel.y;
    } else {
      context.recalculatePath();
      if (context.currentWaypoint) {
        const vel = velocityTowards(playerPos, context.currentWaypoint);
        input.dx = vel.x;
        input.dy = vel.y;
      }
    }

    input.sprint = context.shouldSprint(true);

    // Fire at enemy while retreating
    const inventory = context.player.getInventory();
    const hasRanged = context.stateMachine.hasRangedWeaponWithAmmo(inventory);

    if (hasRanged) {
      const activeItem = context.player.activeItem;
      const weaponType = activeItem?.itemType || "pistol";
      const effectiveRange = getEffectiveShootingRange(weaponType);

      if (dist <= effectiveRange && context.fireTimer >= AI_CONFIG.FIRE_RATE_DELAY) {
        aimAtTargetWithInaccuracy(input, playerPos, enemyPos, AI_CONFIG.SHOOTING_INACCURACY * 1.5);
        input.fire = true;
      }
    } else {
      const activeItem = context.player.activeItem;
      const actualMeleeRange = getMeleeAttackRange(activeItem || undefined);

      if (dist <= actualMeleeRange && context.fireTimer >= AI_CONFIG.FIRE_RATE_DELAY) {
        input.fire = true;
      }
    }
  }
}
