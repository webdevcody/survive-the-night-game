import { Player } from "@/entities/players/player";
import { AI_CONFIG } from "./ai-config";
import { EnhancedThreatInfo } from "./ai-targeting";
import { ThreatAssessment } from "./ai-threat-scorer";
import { InventoryItem } from "@shared/util/inventory";
import { SupplyStatus } from "./ai-readiness";
import { AIState } from "./ai-state-machine";

/**
 * Decision types the AI can make
 */
export enum AIDecision {
  ESCAPE = "ESCAPE", // Very low health - flee completely, no fighting
  ENGAGE_ATTACKER = "ENGAGE_ATTACKER", // Fight the entity attacking us (highest priority)
  ENGAGE_THREAT = "ENGAGE_THREAT", // Fight the highest scored threat
  FINISH_KILL = "FINISH_KILL", // Finish off low HP enemy before retreating
  RETREAT_AND_FIGHT = "RETREAT_AND_FIGHT", // Kite backward while fighting (surrounded)
  RETREAT = "RETREAT", // Pure retreat to heal
  DISENGAGE = "DISENGAGE", // Break off combat to gather supplies
  HUNT = "HUNT", // Search for players
  LOOT = "LOOT", // Collect items
  EXPLORE = "EXPLORE", // Wander
}

/**
 * Result of the decision engine
 */
export interface DecisionResult {
  decision: AIDecision;
  targetThreat: ThreatAssessment | null;
  reason: string;
  shouldForceRetarget: boolean; // True if we should immediately retarget
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
export class AIDecisionEngine {
  /**
   * Enhanced decision making with readiness-based approach and hysteresis
   */
  static makeEnhancedDecision(
    player: Player,
    threatInfo: EnhancedThreatInfo,
    supplyStatus: SupplyStatus,
    currentState: AIState,
    stateTimer: number,
    isAllInMode: boolean,
    hasLootTarget: boolean
  ): DecisionResult {
    const healthPercent = player.getHealth() / player.getMaxHealth();

    // ===========================
    // ZOMBIE AI: SIMPLIFIED BEHAVIOR
    // ===========================
    // Zombie AI players only hunt non-zombie players - no looting, retreating, or complex behaviors
    if (player.isZombie()) {
      // If there's a nearby player target, engage them
      if (threatInfo.hasNearbyEnemy || threatInfo.hasImmediateThreat) {
        return {
          decision: AIDecision.ENGAGE_THREAT,
          targetThreat: threatInfo.immediateThreat,
          reason: "Zombie AI - hunting living players",
          shouldForceRetarget: true,
        };
      }
      // Otherwise, hunt to find players
      return {
        decision: AIDecision.HUNT,
        targetThreat: null,
        reason: "Zombie AI - searching for living players",
        shouldForceRetarget: false,
      };
    }

    // Check for low HP enemy we can finish off
    const finishableEnemy = this.findFinishableEnemy(threatInfo, healthPercent);

    // ===========================
    // Priority 0: RETREAT PERSISTENCE / ALL-IN CHECK
    // ===========================
    // If in retreat, check if we can/should exit
    if (currentState === AIState.RETREAT) {
      const minDurationMet = stateTimer >= AI_CONFIG.STATE_MIN_DURATION_RETREAT;
      const healthRecovered = healthPercent >= AI_CONFIG.RETREAT_EXIT_HEALTH;
      const isFullHealth = healthPercent >= 1.0;

      // If time expired but not healed (and not full health), trigger ALL-IN mode
      if (minDurationMet && !healthRecovered && !isFullHealth) {
        // Go all-in! Fight aggressively regardless of health
        if (threatInfo.hasNearbyEnemy && supplyStatus.hasAnyWeapon) {
          return {
            decision: AIDecision.ENGAGE_THREAT,
            targetThreat: threatInfo.immediateThreat,
            reason: `ALL-IN MODE - retreat timer expired, fighting at ${Math.round(healthPercent * 100)}% HP`,
            shouldForceRetarget: true,
          };
        }
        // No enemies nearby in all-in mode
        // Only hunt if properly equipped (pistol+5 ammo or good weapon with ammo)
        if (supplyStatus.isHuntReady) {
          return {
            decision: AIDecision.HUNT,
            targetThreat: null,
            reason: `ALL-IN MODE - hunting aggressively at ${Math.round(healthPercent * 100)}% HP`,
            shouldForceRetarget: false,
          };
        }
        // Not hunt-ready - loot instead to get better equipment
        return {
          decision: AIDecision.LOOT,
          targetThreat: null,
          reason: `ALL-IN MODE - looting for better weapons at ${Math.round(healthPercent * 100)}% HP`,
          shouldForceRetarget: false,
        };
      }

      // If at full health OR (healed enough and waited long enough), can exit retreat normally
      if (isFullHealth || (healthRecovered && minDurationMet)) {
        // Exit retreat - continue to normal priority checks below
      } else {
        // Still in committed retreat - stay retreating
        // But allow defensive fighting if enemy is in melee range
        const currentAttacker = this.findCurrentAttacker(threatInfo);
        if (currentAttacker && currentAttacker.distance <= AI_CONFIG.MELEE_RANGE) {
          return {
            decision: AIDecision.RETREAT_AND_FIGHT,
            targetThreat: currentAttacker,
            reason: `Defensive only - melee attacker during retreat`,
            shouldForceRetarget: true,
          };
        }

        return {
          decision: AIDecision.RETREAT,
          targetThreat: null,
          reason: `Committed to retreat (${Math.round(stateTimer)}s/${AI_CONFIG.STATE_MIN_DURATION_RETREAT}s, ${Math.round(healthPercent * 100)}%/${Math.round(AI_CONFIG.RETREAT_EXIT_HEALTH * 100)}% HP)`,
          shouldForceRetarget: false,
        };
      }
    }

    // ===========================
    // Priority 1: ESCAPE (VERY LOW HEALTH)
    // ===========================
    if (healthPercent < AI_CONFIG.ESCAPE_HEALTH_THRESHOLD && threatInfo.hasNearbyEnemy) {
      return {
        decision: AIDecision.ESCAPE,
        targetThreat: null,
        reason: `Very low HP (${Math.round(healthPercent * 100)}%) - escaping completely`,
        shouldForceRetarget: false,
      };
    }

    // ===========================
    // Priority 2: CRITICAL HEALTH
    // ===========================
    if (healthPercent < AI_CONFIG.CRITICAL_HEALTH_THRESHOLD) {
      // Exception: Finish low HP enemy if we can
      if (finishableEnemy && healthPercent >= AI_CONFIG.FINISH_KILL_MY_HP) {
        return {
          decision: AIDecision.FINISH_KILL,
          targetThreat: finishableEnemy,
          reason: `Critical HP but can finish enemy at ${Math.round(finishableEnemy.healthPercent * 100)}%`,
          shouldForceRetarget: true,
        };
      }

      if (supplyStatus.hasBandage) {
        return {
          decision: AIDecision.RETREAT,
          targetThreat: null,
          reason: "Critical health - retreating to heal",
          shouldForceRetarget: false,
        };
      }
    }

    // ===========================
    // Priority 3: BEING ATTACKED
    // ===========================
    const currentAttacker = this.findCurrentAttacker(threatInfo);
    if (currentAttacker) {
      // If we can't fight effectively (readiness < 30), try to escape
      if (supplyStatus.shouldAvoidCombat) {
        return {
          decision: AIDecision.ESCAPE,
          targetThreat: currentAttacker,
          reason: `Under attack but unequipped (readiness: ${supplyStatus.combatReadiness}) - escaping`,
          shouldForceRetarget: false,
        };
      }

      // Check if we're surrounded and should kite
      if (threatInfo.isSurrounded && healthPercent < 0.7) {
        return {
          decision: AIDecision.RETREAT_AND_FIGHT,
          targetThreat: currentAttacker,
          reason: "Being attacked while surrounded - kiting backward",
          shouldForceRetarget: true,
        };
      }

      return {
        decision: AIDecision.ENGAGE_ATTACKER,
        targetThreat: currentAttacker,
        reason: `Fighting back (readiness: ${supplyStatus.combatReadiness})`,
        shouldForceRetarget: true,
      };
    }

    // ===========================
    // Priority 4: IMMEDIATE THREAT
    // ===========================
    if (threatInfo.hasImmediateThreat) {
      // If we can't fight effectively, flee
      if (supplyStatus.shouldAvoidCombat) {
        return {
          decision: AIDecision.ESCAPE,
          targetThreat: threatInfo.immediateThreat,
          reason: `Immediate threat but unequipped (readiness: ${supplyStatus.combatReadiness}) - fleeing`,
          shouldForceRetarget: false,
        };
      }

      // Can finish a low HP target?
      if (finishableEnemy) {
        return {
          decision: AIDecision.FINISH_KILL,
          targetThreat: finishableEnemy,
          reason: `Finishing low HP enemy (${Math.round(finishableEnemy.healthPercent * 100)}%)`,
          shouldForceRetarget: false,
        };
      }

      return {
        decision: AIDecision.ENGAGE_THREAT,
        targetThreat: threatInfo.immediateThreat,
        reason: `Immediate threat - must engage`,
        shouldForceRetarget: false,
      };
    }

    // ===========================
    // Priority 5: NEARBY ENEMY
    // ===========================
    if (threatInfo.hasNearbyEnemy) {
      // If minimally equipped and healthy enough, engage
      if (supplyStatus.isMinimallyEquipped && healthPercent >= AI_CONFIG.RETREAT_ENTER_HEALTH) {
        if (finishableEnemy) {
          return {
            decision: AIDecision.FINISH_KILL,
            targetThreat: finishableEnemy,
            reason: `Finishing low HP enemy (${Math.round(finishableEnemy.healthPercent * 100)}%)`,
            shouldForceRetarget: false,
          };
        }

        return {
          decision: AIDecision.ENGAGE_THREAT,
          targetThreat: threatInfo.immediateThreat,
          reason: `Engaging nearby threat (readiness: ${supplyStatus.combatReadiness})`,
          shouldForceRetarget: false,
        };
      }

      // Low health with bandage - retreat
      if (healthPercent < AI_CONFIG.RETREAT_ENTER_HEALTH && supplyStatus.hasBandage) {
        return {
          decision: AIDecision.RETREAT,
          targetThreat: null,
          reason: `Nearby threat but low health - retreating`,
          shouldForceRetarget: false,
        };
      }

      // Not equipped enough - disengage (avoid but don't full flee)
      if (!supplyStatus.isMinimallyEquipped) {
        return {
          decision: AIDecision.DISENGAGE,
          targetThreat: null,
          reason: `Avoiding enemy (readiness: ${supplyStatus.combatReadiness})`,
          shouldForceRetarget: false,
        };
      }
    }

    // ===========================
    // Priority 6: LOW HEALTH
    // ===========================
    if (healthPercent < AI_CONFIG.RETREAT_ENTER_HEALTH && supplyStatus.hasBandage) {
      return {
        decision: AIDecision.RETREAT,
        targetThreat: null,
        reason: "Low health - retreating to heal",
        shouldForceRetarget: false,
      };
    }

    // ===========================
    // Priority 7: HUNT (if ready)
    // ===========================
    if (supplyStatus.isHuntReady) {
      return {
        decision: AIDecision.HUNT,
        targetThreat: null,
        reason: `Hunting (readiness: ${supplyStatus.combatReadiness})`,
        shouldForceRetarget: false,
      };
    }

    // ===========================
    // Priority 8: LOOT (under-equipped)
    // ===========================
    if (!supplyStatus.isHuntReady || hasLootTarget) {
      return {
        decision: AIDecision.LOOT,
        targetThreat: null,
        reason: `Gathering supplies (${supplyStatus.combatReadiness} -> ${AI_CONFIG.READINESS_HUNT})`,
        shouldForceRetarget: false,
      };
    }

    // ===========================
    // Priority 9: EXPLORE
    // ===========================
    return {
      decision: AIDecision.EXPLORE,
      targetThreat: null,
      reason: "Exploring map",
      shouldForceRetarget: false,
    };
  }

  /**
   * Legacy decision making (for backwards compatibility)
   * @deprecated Use makeEnhancedDecision instead
   */
  static makeDecision(
    player: Player,
    threatInfo: EnhancedThreatInfo,
    hasHealing: boolean,
    hasWeapon: boolean,
    hasLootTarget: boolean
  ): DecisionResult {
    const healthPercent = player.getHealth() / player.getMaxHealth();
    const hasGoodEquipment = hasWeapon;

    // Check for low HP enemy we can finish off
    const finishableEnemy = this.findFinishableEnemy(threatInfo, healthPercent);

    // ===========================
    // Priority 0: ESCAPE (VERY LOW HEALTH)
    // ===========================
    // Below escape threshold (30% / 3 HP), flee completely - no fighting at all
    if (healthPercent < AI_CONFIG.ESCAPE_HEALTH_THRESHOLD && threatInfo.hasNearbyEnemy) {
      return {
        decision: AIDecision.ESCAPE,
        targetThreat: null,
        reason: `Very low HP (${Math.round(healthPercent * 100)}%) - escaping completely`,
        shouldForceRetarget: false,
      };
    }

    // ===========================
    // Priority 1: CRITICAL HEALTH
    // ===========================
    if (healthPercent < AI_CONFIG.CRITICAL_HEALTH_THRESHOLD) {
      // Exception: Finish low HP enemy if we can (but not in escape range)
      if (finishableEnemy && healthPercent >= AI_CONFIG.FINISH_KILL_MY_HP) {
        return {
          decision: AIDecision.FINISH_KILL,
          targetThreat: finishableEnemy,
          reason: `Critical HP but can finish enemy at ${Math.round(finishableEnemy.healthPercent * 100)}%`,
          shouldForceRetarget: true,
        };
      }

      if (hasHealing) {
        return {
          decision: AIDecision.RETREAT,
          targetThreat: null,
          reason: "Critical health - retreating to heal",
          shouldForceRetarget: false,
        };
      }
    }

    // ===========================
    // Priority 2: BEING ATTACKED (KEY FIX)
    // ===========================
    // If something is actively hitting us, FIGHT BACK immediately
    const currentAttacker = this.findCurrentAttacker(threatInfo);
    if (currentAttacker) {
      // Check if we're surrounded and should kite
      if (threatInfo.isSurrounded && healthPercent < 0.7) {
        return {
          decision: AIDecision.RETREAT_AND_FIGHT,
          targetThreat: currentAttacker,
          reason: "Being attacked while surrounded - kiting backward",
          shouldForceRetarget: true,
        };
      }

      return {
        decision: AIDecision.ENGAGE_ATTACKER,
        targetThreat: currentAttacker,
        reason: `Retaliating against attacker (last hit ${Date.now() - (currentAttacker.recentDamageFromThis > 0 ? 0 : 999)}ms ago)`,
        shouldForceRetarget: true,
      };
    }

    // ===========================
    // Priority 3: OUTNUMBERED + HURT
    // ===========================
    if (
      threatInfo.enemyCount >= AI_CONFIG.OUTNUMBERED_RETREAT_THRESHOLD &&
      healthPercent < AI_CONFIG.RETREAT_HEALTH_THRESHOLD &&
      hasHealing
    ) {
      // Still attack the highest threat while retreating
      const highestThreat = threatInfo.immediateThreat;
      return {
        decision: AIDecision.RETREAT_AND_FIGHT,
        targetThreat: highestThreat,
        reason: `Outnumbered (${threatInfo.enemyCount} enemies) and hurt - tactical retreat`,
        shouldForceRetarget: false,
      };
    }

    // ===========================
    // Priority 4: THREATS NEARBY - RETREAT OR ENGAGE
    // ===========================
    if (threatInfo.hasImmediateThreat || threatInfo.hasNearbyEnemy) {
      // CRITICAL FIX: Check if we should retreat BEFORE checking if we should engage
      // If we're low health and have healing, retreat even if there's a nearby enemy
      // Only fight back if it's an immediate threat (enemy right on top of us)
      const shouldRetreatFromThreat =
        (healthPercent < AI_CONFIG.RETREAT_HEALTH_THRESHOLD && hasHealing) ||
        !hasWeapon ||
        (threatInfo.nearestEnemyDistance < 150 && healthPercent < 0.7); // Close threat when hurt

      // Only retreat if NOT an immediate threat (immediate threats must be fought)
      if (shouldRetreatFromThreat && !threatInfo.hasImmediateThreat) {
        return {
          decision: AIDecision.RETREAT,
          targetThreat: null,
          reason: `Retreating from nearby threat (${Math.round(threatInfo.nearestEnemyDistance)}px away) - low health`,
          shouldForceRetarget: true, // Force retarget to update retreat position
        };
      }

      // If immediate threat, we must fight (unless we're escaping)
      if (threatInfo.hasImmediateThreat) {
        // Exception: If can finish a low HP target
        if (finishableEnemy) {
          return {
            decision: AIDecision.FINISH_KILL,
            targetThreat: finishableEnemy,
            reason: `Finishing low HP enemy (${Math.round(finishableEnemy.healthPercent * 100)}%)`,
            shouldForceRetarget: false,
          };
        }

        return {
          decision: AIDecision.ENGAGE_THREAT,
          targetThreat: threatInfo.immediateThreat,
          reason: `Immediate threat - must engage`,
          shouldForceRetarget: false,
        };
      }

      // Nearby enemy (not immediate) - engage if we have weapon and are healthy enough
      // CRITICAL: If player is very close (< 150px), engage if we have any weapon AND are healthy
      if (threatInfo.nearestEnemyDistance < 150 && hasWeapon && healthPercent >= AI_CONFIG.RETREAT_HEALTH_THRESHOLD) {
        // Exception: If can finish a low HP target
        if (finishableEnemy) {
          return {
            decision: AIDecision.FINISH_KILL,
            targetThreat: finishableEnemy,
            reason: `Finishing low HP enemy (${Math.round(finishableEnemy.healthPercent * 100)}%)`,
            shouldForceRetarget: false,
          };
        }

        return {
          decision: AIDecision.ENGAGE_THREAT,
          targetThreat: threatInfo.immediateThreat,
          reason: `Engaging nearby threat at ${Math.round(threatInfo.nearestEnemyDistance)}px`,
          shouldForceRetarget: false,
        };
      }

      // Only engage if we have a weapon and are healthy enough
      if (hasWeapon && healthPercent >= AI_CONFIG.RETREAT_HEALTH_THRESHOLD) {
        // Exception: If can finish a low HP target
        if (finishableEnemy) {
          return {
            decision: AIDecision.FINISH_KILL,
            targetThreat: finishableEnemy,
            reason: `Finishing low HP enemy (${Math.round(finishableEnemy.healthPercent * 100)}%)`,
            shouldForceRetarget: false,
          };
        }

        return {
          decision: AIDecision.ENGAGE_THREAT,
          targetThreat: threatInfo.immediateThreat,
          reason: `Engaging threat at ${Math.round(threatInfo.nearestEnemyDistance)}px`,
          shouldForceRetarget: false,
        };
      }
    }

    // ===========================
    // Priority 5: LOW HEALTH
    // ===========================
    if (healthPercent < AI_CONFIG.RETREAT_HEALTH_THRESHOLD && hasHealing) {
      return {
        decision: AIDecision.RETREAT,
        targetThreat: null,
        reason: "Low health - retreating to heal",
        shouldForceRetarget: false,
      };
    }

    // ===========================
    // Priority 6: NO THREATS
    // ===========================
    if (hasGoodEquipment) {
      return {
        decision: AIDecision.HUNT,
        targetThreat: null,
        reason: "Well equipped - hunting for targets",
        shouldForceRetarget: false,
      };
    }

    if (hasLootTarget) {
      return {
        decision: AIDecision.LOOT,
        targetThreat: null,
        reason: "Collecting loot",
        shouldForceRetarget: false,
      };
    }

    return {
      decision: AIDecision.EXPLORE,
      targetThreat: null,
      reason: "Exploring map",
      shouldForceRetarget: false,
    };
  }

  /**
   * Find an enemy that's currently attacking us (hit in last 500ms)
   */
  private static findCurrentAttacker(
    threatInfo: EnhancedThreatInfo
  ): ThreatAssessment | null {
    // Return the highest-scored threat that is attacking us
    for (const threat of threatInfo.threats) {
      if (threat.isAttackingMe) {
        return threat;
      }
    }
    return null;
  }

  /**
   * Find an enemy that's low HP enough to finish off
   * Only returns if:
   * - Enemy is below FINISH_KILL_ENEMY_HP (15%)
   * - We're above FINISH_KILL_MY_HP (30%)
   * - Enemy is within engagement range
   */
  private static findFinishableEnemy(
    threatInfo: EnhancedThreatInfo,
    myHealthPercent: number
  ): ThreatAssessment | null {
    // Don't try to finish kills if we're too hurt
    if (myHealthPercent < AI_CONFIG.FINISH_KILL_MY_HP) {
      return null;
    }

    for (const threat of threatInfo.threats) {
      if (
        threat.healthPercent < AI_CONFIG.FINISH_KILL_ENEMY_HP &&
        threat.distance <= AI_CONFIG.COMBAT_ENGAGE_RADIUS
      ) {
        return threat;
      }
    }

    return null;
  }

  /**
   * Check if we should force an immediate retarget
   * Called when we take damage
   */
  static shouldForceRetarget(
    currentTargetId: number | null,
    attackerId: number
  ): boolean {
    // Always retarget if we don't have a target
    if (currentTargetId === null) return true;

    // Retarget if the attacker is different from our current target
    return currentTargetId !== attackerId;
  }

  /**
   * Get the appropriate retarget interval based on combat state
   */
  static getRetargetInterval(isInCombat: boolean): number {
    return isInCombat
      ? AI_CONFIG.COMBAT_RETARGET_INTERVAL
      : AI_CONFIG.IDLE_RETARGET_INTERVAL;
  }
}
