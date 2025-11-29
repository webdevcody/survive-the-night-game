import { IGameManagers } from "@/managers/types";
import { Player } from "@/entities/players/player";
import { IEntity } from "@/entities/types";
import Vector2 from "@/util/vector2";
import Positionable from "@/extensions/positionable";
import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Destructible from "@/extensions/destructible";
import { distance } from "@shared/util/physics";
import { Entities, getZombieTypesSet } from "@shared/constants";
import { InventoryItem } from "@shared/util/inventory";
import { AIPathfinder } from "./ai-pathfinding";
import {
  AI_CONFIG,
  GOOD_WEAPONS,
  WEAPON_AMMO_MAP,
  WEAPON_RANGES,
  ALL_WEAPONS,
} from "./ai-config";
import { getConfig } from "@shared/config";
import PoolManager from "@shared/util/pool-manager";
import { ThreatInfo } from "./ai-state-machine";
import { DamageHistory } from "./ai-threat-tracker";
import { ThreatScorer, ThreatAssessment } from "./ai-threat-scorer";

export interface AITarget {
  type: "item" | "player" | "crate" | "barrel" | "position" | "zombie" | "enemy";
  entity?: IEntity;
  position: Vector2;
  priority: number;
  distance?: number;
}

/**
 * Enhanced threat information with damage-based prioritization
 */
export interface EnhancedThreatInfo {
  // The most dangerous threat (based on threat score, not just distance)
  immediateThreat: ThreatAssessment | null;

  // All threats sorted by score (highest first)
  threats: ThreatAssessment[];

  // Enemy counts
  enemyCount: number;
  zombieCount: number;
  playerCount: number;

  // Situational awareness
  isSurrounded: boolean; // 3+ enemies in different directions
  isBeingFocused: boolean; // Taking damage from multiple sources

  // Retreat direction (away from most threats)
  safestRetreatDirection: Vector2 | null;

  // Backward compatible fields
  hasImmediateThreat: boolean;
  hasNearbyEnemy: boolean;
  nearestEnemyDistance: number;
  enemyType: "zombie" | "player" | "none";
}

/**
 * AI targeting system for finding items, enemies, and safe positions
 */
export class AITargetingSystem {
  private gameManagers: IGameManagers;
  private pathfinder: AIPathfinder;

  constructor(gameManagers: IGameManagers) {
    this.gameManagers = gameManagers;
    this.pathfinder = new AIPathfinder(gameManagers);
  }

  /**
   * Get comprehensive threat information for the state machine
   */
  getThreatInfo(player: Player): ThreatInfo {
    const playerPos = player.getCenterPosition();
    const entityManager = this.gameManagers.getEntityManager();
    const zombieTypes = getZombieTypesSet();

    let nearestEnemyDistance = Infinity;
    let enemyType: "zombie" | "player" | "none" = "none";
    let hasImmediateThreat = false;
    let hasNearbyEnemy = false;

    // Check for zombies
    const nearbyEntities = entityManager.getNearbyEntities(
      playerPos,
      AI_CONFIG.ZOMBIE_DETECTION_RADIUS
    );

    for (const entity of nearbyEntities) {
      const entityType = entity.getType();
      if (!zombieTypes.has(entityType as any)) continue;
      if (entity.hasExt(Destructible) && entity.getExt(Destructible).isDead()) continue;
      if (!entity.hasExt(Positionable)) continue;

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const dist = distance(playerPos, entityPos);

      if (dist < nearestEnemyDistance) {
        nearestEnemyDistance = dist;
        enemyType = "zombie";
      }

      if (dist <= AI_CONFIG.IMMEDIATE_THREAT_RADIUS) {
        hasImmediateThreat = true;
      }
      if (dist <= AI_CONFIG.COMBAT_ENGAGE_RADIUS) {
        hasNearbyEnemy = true;
      }
    }

    // Check for other players
    const players = entityManager.getPlayerEntities() as Player[];
    for (const otherPlayer of players) {
      if (otherPlayer.getId() === player.getId()) continue;
      if (otherPlayer.isDead()) continue;

      const otherPos = otherPlayer.getCenterPosition();
      const dist = distance(playerPos, otherPos);

      if (dist < nearestEnemyDistance) {
        nearestEnemyDistance = dist;
        enemyType = "player";
      }

      if (dist <= AI_CONFIG.IMMEDIATE_THREAT_RADIUS) {
        hasImmediateThreat = true;
      }
      if (dist <= AI_CONFIG.COMBAT_ENGAGE_RADIUS) {
        hasNearbyEnemy = true;
      }
    }

    return {
      hasImmediateThreat,
      hasNearbyEnemy,
      nearestEnemyDistance,
      enemyType,
    };
  }

  /**
   * Get enhanced threat information with damage-based prioritization
   * This is the KEY FIX for the "AI targets distant players over attacking zombies" bug
   */
  getEnhancedThreatInfo(
    player: Player,
    damageHistory: DamageHistory,
    currentWeaponType?: string
  ): EnhancedThreatInfo {
    const playerPos = player.getCenterPosition();
    const entityManager = this.gameManagers.getEntityManager();
    const zombieTypes = getZombieTypesSet();
    const poolManager = PoolManager.getInstance();

    // Determine weapon range
    const weaponRange = currentWeaponType
      ? WEAPON_RANGES[currentWeaponType] ?? AI_CONFIG.MELEE_RANGE
      : AI_CONFIG.MELEE_RANGE;

    const threats: ThreatAssessment[] = [];
    let zombieCount = 0;
    let playerCount = 0;

    // Collect threat direction vectors for surrounded detection
    const threatDirections: Vector2[] = [];

    // Scan zombies
    const nearbyEntities = entityManager.getNearbyEntities(
      playerPos,
      Math.max(AI_CONFIG.ZOMBIE_DETECTION_RADIUS, AI_CONFIG.PLAYER_DETECTION_RADIUS)
    );

    for (const entity of nearbyEntities) {
      const entityType = entity.getType();

      // Check if it's a zombie
      if (zombieTypes.has(entityType as any)) {
        const assessment = ThreatScorer.assessThreat(
          playerPos,
          entity,
          damageHistory,
          weaponRange
        );

        if (assessment) {
          threats.push(assessment);
          zombieCount++;

          // Track direction for surrounded detection
          if (entity.hasExt(Positionable)) {
            const enemyPos = entity.getExt(Positionable).getCenterPosition();
            const dir = poolManager.vector2.claim(
              enemyPos.x - playerPos.x,
              enemyPos.y - playerPos.y
            );
            threatDirections.push(dir);
          }
        }
      }
    }

    // Scan players
    const players = entityManager.getPlayerEntities() as Player[];
    const isZombieAI = player.isZombie();
    for (const otherPlayer of players) {
      if (otherPlayer.getId() === player.getId()) continue;
      if (otherPlayer.isDead()) continue;

      // Zombie AI only considers non-zombie players as threats
      if (isZombieAI && otherPlayer.isZombie()) continue;

      const assessment = ThreatScorer.assessThreat(
        playerPos,
        otherPlayer as unknown as IEntity,
        damageHistory,
        weaponRange
      );

      if (assessment) {
        threats.push(assessment);
        playerCount++;

        // Track direction for surrounded detection
        const enemyPos = otherPlayer.getCenterPosition();
        const dir = poolManager.vector2.claim(
          enemyPos.x - playerPos.x,
          enemyPos.y - playerPos.y
        );
        threatDirections.push(dir);
      }
    }

    // Sort threats by score (highest first)
    const sortedThreats = ThreatScorer.sortByPriority(threats);

    // Find immediate threat (highest scored)
    const immediateThreat = sortedThreats.length > 0 ? sortedThreats[0] : null;

    // Calculate if surrounded (3+ enemies in different directions)
    const isSurrounded = this.checkIfSurrounded(threatDirections);

    // Check if being focused (multiple attackers)
    const currentAttackers = sortedThreats.filter((t) => t.isAttackingMe);
    const isBeingFocused = currentAttackers.length >= 2;

    // Calculate safest retreat direction
    const safestRetreatDirection = this.calculateSafestRetreatDirection(
      playerPos,
      threatDirections
    );

    // Release pooled direction vectors
    for (const dir of threatDirections) {
      poolManager.vector2.release(dir);
    }

    // Backward compatible fields
    const hasImmediateThreat =
      immediateThreat !== null &&
      immediateThreat.distance <= AI_CONFIG.IMMEDIATE_THREAT_RADIUS;
    const hasNearbyEnemy =
      immediateThreat !== null &&
      immediateThreat.distance <= AI_CONFIG.COMBAT_ENGAGE_RADIUS;
    const nearestEnemyDistance = immediateThreat?.distance ?? Infinity;
    const enemyType: "zombie" | "player" | "none" =
      immediateThreat?.entityType ?? "none";

    return {
      immediateThreat,
      threats: sortedThreats,
      enemyCount: zombieCount + playerCount,
      zombieCount,
      playerCount,
      isSurrounded,
      isBeingFocused,
      safestRetreatDirection,
      hasImmediateThreat,
      hasNearbyEnemy,
      nearestEnemyDistance,
      enemyType,
    };
  }

  /**
   * Check if AI is surrounded (3+ enemies in different directions)
   * Uses angle-based clustering to detect encirclement
   */
  private checkIfSurrounded(directions: Vector2[]): boolean {
    if (directions.length < AI_CONFIG.SURROUNDED_THRESHOLD) return false;

    // Convert directions to angles
    const angles = directions.map((dir) => Math.atan2(dir.y, dir.x));

    // Sort angles
    angles.sort((a, b) => a - b);

    // Check if enemies are spread across different quadrants
    // If largest gap between consecutive angles is < 180°, we're surrounded
    let maxGap = 0;
    for (let i = 0; i < angles.length; i++) {
      const nextAngle = angles[(i + 1) % angles.length];
      const currentAngle = angles[i];
      let gap = nextAngle - currentAngle;

      // Handle wraparound
      if (i === angles.length - 1) {
        gap = Math.PI * 2 - currentAngle + angles[0];
      }

      maxGap = Math.max(maxGap, gap);
    }

    // If max gap is less than 180° (π radians), we're surrounded
    return maxGap < Math.PI;
  }

  /**
   * Calculate the safest direction to retreat (away from most threats)
   */
  private calculateSafestRetreatDirection(
    playerPos: Vector2,
    threatDirections: Vector2[]
  ): Vector2 | null {
    if (threatDirections.length === 0) return null;

    const poolManager = PoolManager.getInstance();

    // Calculate average threat direction
    let avgX = 0;
    let avgY = 0;

    for (const dir of threatDirections) {
      // Normalize each direction for equal weight
      const mag = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
      if (mag > 0) {
        avgX += dir.x / mag;
        avgY += dir.y / mag;
      }
    }

    // Retreat direction is opposite of average threat direction
    const retreatDir = poolManager.vector2.claim(-avgX, -avgY);

    // Normalize
    const mag = Math.sqrt(retreatDir.x * retreatDir.x + retreatDir.y * retreatDir.y);
    if (mag > 0) {
      retreatDir.x /= mag;
      retreatDir.y /= mag;
    }

    return retreatDir;
  }

  /**
   * Find the best enemy to attack using enhanced threat scoring
   * This replaces findNearestEnemy when damage history is available
   */
  findBestEnemy(
    player: Player,
    damageHistory: DamageHistory,
    currentWeaponType?: string
  ): AITarget | null {
    const enhancedInfo = this.getEnhancedThreatInfo(
      player,
      damageHistory,
      currentWeaponType
    );

    if (!enhancedInfo.immediateThreat) return null;

    const threat = enhancedInfo.immediateThreat;

    return {
      type: "enemy",
      entity: threat.entity,
      position: threat.entity.getExt(Positionable).getCenterPosition(),
      priority:
        threat.distance <= AI_CONFIG.IMMEDIATE_THREAT_RADIUS
          ? AI_CONFIG.PRIORITY_IMMEDIATE_THREAT
          : AI_CONFIG.PRIORITY_ZOMBIE_THREAT,
      distance: threat.distance,
    };
  }

  /**
   * Find the nearest enemy (zombie or player) to attack
   * For zombie AI, only targets non-zombie players (no zombies)
   */
  findNearestEnemy(player: Player): AITarget | null {
    const playerPos = player.getCenterPosition();
    const entityManager = this.gameManagers.getEntityManager();
    const zombieTypes = getZombieTypesSet();
    const isZombieAI = player.isZombie();

    let nearestEnemy: IEntity | null = null;
    let nearestDistance = Infinity;
    let nearestType: "zombie" | "player" = "zombie";

    // Zombie AI doesn't target other zombies - skip zombie detection entirely
    if (!isZombieAI) {
      // Check zombies
      const nearbyEntities = entityManager.getNearbyEntities(
        playerPos,
        AI_CONFIG.ZOMBIE_DETECTION_RADIUS
      );

      for (const entity of nearbyEntities) {
        const entityType = entity.getType();
        if (!zombieTypes.has(entityType as any)) continue;
        if (entity.hasExt(Destructible) && entity.getExt(Destructible).isDead()) continue;
        if (!entity.hasExt(Positionable)) continue;

        const entityPos = entity.getExt(Positionable).getCenterPosition();
        const dist = distance(playerPos, entityPos);

        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestEnemy = entity;
          nearestType = "zombie";
        }
      }
    }

    // Check players
    const players = entityManager.getPlayerEntities() as Player[];
    for (const otherPlayer of players) {
      if (otherPlayer.getId() === player.getId()) continue;
      if (otherPlayer.isDead()) continue;

      // Zombie AI only targets non-zombie players
      if (isZombieAI && otherPlayer.isZombie()) continue;

      const otherPos = otherPlayer.getCenterPosition();
      const dist = distance(playerPos, otherPos);

      // Use pure distance-based targeting (no more player bias)
      // The enhanced threat scoring system handles priority properly
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestEnemy = otherPlayer as unknown as IEntity;
        nearestType = "player";
      }
    }

    if (nearestEnemy && nearestEnemy.hasExt(Positionable)) {
      return {
        type: "enemy",
        entity: nearestEnemy,
        position: nearestEnemy.getExt(Positionable).getCenterPosition(),
        priority: nearestDistance <= AI_CONFIG.IMMEDIATE_THREAT_RADIUS
          ? AI_CONFIG.PRIORITY_IMMEDIATE_THREAT
          : AI_CONFIG.PRIORITY_ZOMBIE_THREAT,
        distance: nearestDistance,
      };
    }

    return null;
  }

  /**
   * Find the best loot target for the AI player
   * Prioritizes health packs when hurt and ammo when low
   */
  findBestLootTarget(player: Player): AITarget | null {
    const playerPos = player.getCenterPosition();
    const inventory = player.getInventory();

    const needsWeapon = !this.hasGoodWeapon(inventory);
    const needsAmmo = this.needsAmmo(inventory);
    const healthPercent = player.getHealth() / player.getMaxHealth();
    const needsHealth = healthPercent < 0.7;

    // Calculate urgency multipliers based on how critical the need is
    // This ensures health packs are strongly prioritized when low HP
    const healthUrgencyMultiplier = needsHealth
      ? Math.max(1.5, 3.0 - (healthPercent * 3)) // At 20% HP: 2.4x, at 50% HP: 1.5x
      : 1.0;
    const ammoUrgencyMultiplier = needsAmmo ? 1.5 : 1.0;

    const entityManager = this.gameManagers.getEntityManager();
    const nearbyEntities = entityManager.getNearbyEntities(playerPos, AI_CONFIG.SEARCH_RADIUS);

    let bestTarget: AITarget | null = null;
    let bestScore = -1; // Use score (priority / distance) for better selection

    for (const entity of nearbyEntities) {
      if (entity.getId() === player.getId()) continue;

      // Check crates (need to break open) - lower priority when we urgently need health/ammo
      if (entity.getType() === Entities.CRATE) {
        // Skip crates that are already destroyed or marked for removal
        if (entity.isMarkedForRemoval()) continue;

        if (entity.hasExt(Positionable) && entity.hasExt(Destructible)) {
          const entityPos = entity.getExt(Positionable).getCenterPosition();
          if (this.pathfinder.isToxicPosition(entityPos)) continue;

          const dist = distance(playerPos, entityPos);
          // Reduce crate priority when we urgently need health or ammo
          // (crates might not have what we need)
          const cratePriority = (needsHealth && healthPercent < 0.5)
            ? AI_CONFIG.PRIORITY_CRATE * 0.5
            : AI_CONFIG.PRIORITY_CRATE;
          const score = cratePriority / Math.max(dist, 1);

          if (score > bestScore) {
            bestScore = score;
            // Clone position to avoid reference issues (getCenterPosition returns cached object)
            bestTarget = {
              type: "crate",
              entity: entity,
              position: new Vector2(entityPos.x, entityPos.y),
              priority: cratePriority,
              distance: dist,
            };
          }
        }
        continue;
      }

      // Check barrels/gallon drums (need to interact/search) - lower priority when urgent
      if (entity.getType() === Entities.GALLON_DRUM) {
        // Skip barrels that are already looted or marked for removal
        if (entity.isMarkedForRemoval()) continue;

        if (entity.hasExt(Positionable) && entity.hasExt(Interactive)) {
          const entityPos = entity.getExt(Positionable).getCenterPosition();
          if (this.pathfinder.isToxicPosition(entityPos)) continue;

          const dist = distance(playerPos, entityPos);
          // Reduce barrel priority when we urgently need health
          const barrelPriority = (needsHealth && healthPercent < 0.5)
            ? AI_CONFIG.PRIORITY_BARREL * 0.5
            : AI_CONFIG.PRIORITY_BARREL;
          const score = barrelPriority / Math.max(dist, 1);

          if (score > bestScore) {
            bestScore = score;
            // Clone position to avoid reference issues (getCenterPosition returns cached object)
            bestTarget = {
              type: "barrel",
              entity: entity,
              position: new Vector2(entityPos.x, entityPos.y),
              priority: barrelPriority,
              distance: dist,
            };
          }
        }
        continue;
      }

      // Check carryable items
      if (!entity.hasExt(Carryable) || !entity.hasExt(Positionable)) continue;
      if (!entity.hasExt(Interactive)) continue;

      const itemType = entity.getExt(Carryable).getItemType();
      const entityPos = entity.getExt(Positionable).getCenterPosition();

      if (this.pathfinder.isToxicPosition(entityPos)) continue;

      // Skip items we can't pick up (inventory full and not stackable)
      if (!this.canPickUpItem(inventory, itemType)) continue;

      // Get base priority and apply urgency multipliers
      let priority = this.getLootPriority(itemType, needsWeapon, needsAmmo, needsHealth);
      if (priority <= 0) continue;

      // Apply urgency multipliers for health and ammo items
      if (itemType === "bandage" && needsHealth) {
        priority *= healthUrgencyMultiplier;
      } else if (itemType.includes("ammo") && needsAmmo) {
        priority *= ammoUrgencyMultiplier;
      }

      const dist = distance(playerPos, entityPos);
      const score = priority / Math.max(dist, 1);

      if (score > bestScore) {
        bestScore = score;
        // Clone position to avoid reference issues (getCenterPosition returns cached object)
        bestTarget = {
          type: "item",
          entity: entity,
          position: new Vector2(entityPos.x, entityPos.y),
          priority: priority,
          distance: dist,
        };
      }
    }

    return bestTarget;
  }

  /**
   * Find the nearest bandage for the AI player (used during retreat)
   */
  findNearestBandage(player: Player): AITarget | null {
    const playerPos = player.getCenterPosition();
    const inventory = player.getInventory();
    const entityManager = this.gameManagers.getEntityManager();
    const nearbyEntities = entityManager.getNearbyEntities(playerPos, AI_CONFIG.SEARCH_RADIUS);

    // Skip if inventory is full and we can't stack bandages
    if (!this.canPickUpItem(inventory, "bandage")) {
      return null;
    }

    let nearestBandage: AITarget | null = null;
    let nearestDistance = Infinity;

    for (const entity of nearbyEntities) {
      if (entity.getId() === player.getId()) continue;
      if (!entity.hasExt(Carryable) || !entity.hasExt(Positionable)) continue;
      if (!entity.hasExt(Interactive)) continue;

      const itemType = entity.getExt(Carryable).getItemType();
      if (itemType !== "bandage") continue;

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      if (this.pathfinder.isToxicPosition(entityPos)) continue;

      const dist = distance(playerPos, entityPos);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        // Clone position to avoid reference issues (getCenterPosition returns cached object)
        nearestBandage = {
          type: "item",
          entity: entity,
          position: new Vector2(entityPos.x, entityPos.y),
          priority: AI_CONFIG.PRIORITY_HEALTH_URGENT,
          distance: dist,
        };
      }
    }

    return nearestBandage;
  }

  /**
   * Find the best player target to hunt
   * If the AI is a zombie, only targets non-zombie living players
   */
  findBestPlayerTarget(player: Player): AITarget | null {
    const playerPos = player.getCenterPosition();
    const entityManager = this.gameManagers.getEntityManager();
    const players = entityManager.getPlayerEntities() as Player[];
    const isZombieAI = player.isZombie();

    let closestPlayer: Player | null = null;
    let closestDistance = Infinity;

    for (const otherPlayer of players) {
      if (otherPlayer.getId() === player.getId()) continue;
      if (otherPlayer.isDead()) continue;

      // Zombie AI can only target non-zombie players
      if (isZombieAI && otherPlayer.isZombie()) continue;

      const otherPos = otherPlayer.getCenterPosition();
      if (this.pathfinder.isToxicPosition(otherPos)) continue;

      const dist = distance(playerPos, otherPos);
      if (dist < closestDistance && dist <= AI_CONFIG.PLAYER_DETECTION_RADIUS) {
        closestDistance = dist;
        closestPlayer = otherPlayer;
      }
    }

    if (closestPlayer) {
      return {
        type: "player",
        entity: closestPlayer as unknown as IEntity,
        position: closestPlayer.getCenterPosition(),
        priority: AI_CONFIG.PRIORITY_PLAYER_TARGET,
        distance: closestDistance,
      };
    }

    return null;
  }

  /**
   * Find a safe retreat position considering ALL threats (players AND zombies)
   * Uses A* pathfinding to verify the path is actually reachable and safe
   */
  findSafeRetreatPosition(player: Player): AITarget {
    const playerPos = player.getCenterPosition();
    const entityManager = this.gameManagers.getEntityManager();
    const zombieTypes = getZombieTypesSet();

    // Calculate repulsion direction from all threats
    let retreatX = 0;
    let retreatY = 0;

    // Add repulsion from nearby players
    const players = entityManager.getPlayerEntities() as Player[];
    for (const otherPlayer of players) {
      if (otherPlayer.getId() === player.getId() || otherPlayer.isDead()) continue;

      const enemyPos = otherPlayer.getCenterPosition();
      const dist = distance(playerPos, enemyPos);

      if (dist < 300 && dist > 0) {
        const repulsionStrength = 200 / dist;
        retreatX += (playerPos.x - enemyPos.x) * repulsionStrength;
        retreatY += (playerPos.y - enemyPos.y) * repulsionStrength;
      }
    }

    // Add repulsion from nearby zombies
    const nearbyEntities = entityManager.getNearbyEntities(playerPos, 300);
    for (const entity of nearbyEntities) {
      const entityType = entity.getType();
      if (!zombieTypes.has(entityType as any)) continue;
      if (entity.hasExt(Destructible) && entity.getExt(Destructible).isDead()) continue;
      if (!entity.hasExt(Positionable)) continue;

      const enemyPos = entity.getExt(Positionable).getCenterPosition();
      const dist = distance(playerPos, enemyPos);

      if (dist > 0) {
        const repulsionStrength = 250 / dist;
        retreatX += (playerPos.x - enemyPos.x) * repulsionStrength;
        retreatY += (playerPos.y - enemyPos.y) * repulsionStrength;
      }
    }

    const poolManager = PoolManager.getInstance();
    const totalSize =
      getConfig().world.MAP_SIZE * getConfig().world.BIOME_SIZE * getConfig().world.TILE_SIZE;

    // Normalize the repulsion direction
    const magnitude = Math.sqrt(retreatX * retreatX + retreatY * retreatY);
    if (magnitude > 0) {
      retreatX = retreatX / magnitude;
      retreatY = retreatY / magnitude;
    }

    // Try retreat direction at multiple distances, verifying PATH is clear (not just destination)
    const retreatDistances = [200, 150, 100, 250, 300];
    for (const dist of retreatDistances) {
      let targetX: number;
      let targetY: number;

      if (magnitude > 0) {
        // Use calculated retreat direction
        targetX = playerPos.x + retreatX * dist;
        targetY = playerPos.y + retreatY * dist;
      } else {
        // No threats - try random direction
        const randomAngle = Math.random() * Math.PI * 2;
        targetX = playerPos.x + Math.cos(randomAngle) * dist;
        targetY = playerPos.y + Math.sin(randomAngle) * dist;
      }

      // Clamp to map bounds
      targetX = Math.max(0, Math.min(totalSize - 1, targetX));
      targetY = Math.max(0, Math.min(totalSize - 1, targetY));

      const targetPos = poolManager.vector2.claim(targetX, targetY);

      // Verify PATH is walkable (not just destination) using A* pathfinding
      const waypoint = this.pathfinder.pathTowardsAvoidingToxic(playerPos, targetPos);
      if (waypoint) {
        // Found a valid path - use this target
        return {
          type: "position",
          position: targetPos,
          priority: 100,
        };
      }

      poolManager.vector2.release(targetPos);
    }

    // All retreat directions blocked - try random directions
    for (let attempt = 0; attempt < 8; attempt++) {
      const randomAngle = Math.random() * Math.PI * 2;
      const randomDist = 100 + Math.random() * 150;
      let targetX = playerPos.x + Math.cos(randomAngle) * randomDist;
      let targetY = playerPos.y + Math.sin(randomAngle) * randomDist;

      // Clamp to map bounds
      targetX = Math.max(0, Math.min(totalSize - 1, targetX));
      targetY = Math.max(0, Math.min(totalSize - 1, targetY));

      const targetPos = poolManager.vector2.claim(targetX, targetY);
      const waypoint = this.pathfinder.pathTowardsAvoidingToxic(playerPos, targetPos);
      if (waypoint) {
        return {
          type: "position",
          position: targetPos,
          priority: 100,
        };
      }

      poolManager.vector2.release(targetPos);
    }

    // Ultimate fallback: retreat toward map center (always safe from toxic gas)
    const mapCenter = this.pathfinder.getMapCenter();
    const waypoint = this.pathfinder.pathTowardsAvoidingToxic(playerPos, mapCenter);
    if (waypoint) {
      return {
        type: "position",
        position: mapCenter,
        priority: 100,
      };
    }

    // Completely stuck - return current position (don't move)
    return {
      type: "position",
      position: poolManager.vector2.claim(playerPos.x, playerPos.y),
      priority: 100,
    };
  }

  /**
   * Find the nearest unexplored special biome (farm, city, dock, gas station, shed)
   * Returns null if all special biomes have been explored or none exist
   */
  findNearestSpecialBiome(
    player: Player,
    exploredBiomes: Set<string>
  ): AITarget | null {
    const mapManager = this.gameManagers.getMapManager();
    const mapData = mapManager.getMapData();
    const biomePositions = mapData.biomePositions;
    const playerPos = player.getCenterPosition();
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const BIOME_SIZE = getConfig().world.BIOME_SIZE;

    let nearestBiome: AITarget | null = null;
    let nearestDistance = Infinity;

    // Check each special biome
    const specialBiomes = [
      { name: "farm", pos: biomePositions.farm },
      { name: "city", pos: biomePositions.city },
      { name: "dock", pos: biomePositions.dock },
      { name: "gasStation", pos: biomePositions.gasStation },
      { name: "shed", pos: biomePositions.shed },
    ];

    for (const biome of specialBiomes) {
      if (!biome.pos) continue;

      const biomeKey = `${biome.pos.x},${biome.pos.y}`;
      
      // Skip if already explored
      if (exploredBiomes.has(biomeKey)) continue;

      // Calculate biome center position with some randomization to prevent clustering
      // Add random offset so AI don't all target the exact same spot
      const baseCenterX = (biome.pos.x + 0.5) * BIOME_SIZE * TILE_SIZE;
      const baseCenterY = (biome.pos.y + 0.5) * BIOME_SIZE * TILE_SIZE;
      // Random offset within biome (up to 50% of biome size)
      const randomOffsetX = (Math.random() - 0.5) * BIOME_SIZE * TILE_SIZE * 0.5;
      const randomOffsetY = (Math.random() - 0.5) * BIOME_SIZE * TILE_SIZE * 0.5;
      const biomeCenter = { 
        x: baseCenterX + randomOffsetX, 
        y: baseCenterY + randomOffsetY 
      } as Vector2;

      // Skip if in toxic zone
      if (this.pathfinder.isToxicPosition(biomeCenter)) continue;

      const dist = distance(playerPos, biomeCenter);

      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestBiome = {
          type: "position",
          position: biomeCenter,
          priority: AI_CONFIG.PRIORITY_SPECIAL_BIOME,
          distance: dist,
        };
      }
    }

    return nearestBiome;
  }

  /**
   * Get a random explore target that avoids already explored areas
   * Includes repulsion from other players to prevent clustering
   * Never targets fixed points like campsite
   */
  getExploreTarget(player: Player, exploredCells?: Set<string>): AITarget {
    const playerPos = player.getCenterPosition();
    const entityManager = this.gameManagers.getEntityManager();
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const CELL_SIZE = 128; // Match exploration tracker cell size

    // Calculate repulsion from nearby players to prevent clustering
    let repulsionX = 0;
    let repulsionY = 0;
    const players = entityManager.getPlayerEntities() as Player[];
    for (const otherPlayer of players) {
      if (otherPlayer.getId() === player.getId() || otherPlayer.isDead()) continue;

      const otherPos = otherPlayer.getCenterPosition();
      const dist = distance(playerPos, otherPos);

      // Strong repulsion from nearby players (within 200px)
      if (dist < 200 && dist > 0) {
        const repulsionStrength = 300 / dist; // Strong repulsion to prevent clustering
        repulsionX += (playerPos.x - otherPos.x) * repulsionStrength;
        repulsionY += (playerPos.y - otherPos.y) * repulsionStrength;
      }
    }

    // Try to find an unexplored direction
    let targetPos: Vector2 | null = null;
    const poolManager = PoolManager.getInstance();

    // Try multiple random directions, preferring unexplored areas
    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = Math.random() * Math.PI * 2;

      let targetX: number;
      let targetY: number;

      // Apply repulsion first
      let baseX = playerPos.x;
      let baseY = playerPos.y;
      
      // Normalize repulsion and apply it
      const repulsionMag = Math.sqrt(repulsionX * repulsionX + repulsionY * repulsionY);
      if (repulsionMag > 0) {
        baseX += (repulsionX / repulsionMag) * 150; // Move away from other players
        baseY += (repulsionY / repulsionMag) * 150;
      }

      // Always use random exploration (never move toward fixed points)
      targetX = baseX + Math.cos(angle) * 300;
      targetY = baseY + Math.sin(angle) * 300;

      const candidatePos = poolManager.vector2.claim(targetX, targetY);

      // Clamp to map bounds first
      const totalSize =
        getConfig().world.MAP_SIZE * getConfig().world.BIOME_SIZE * getConfig().world.TILE_SIZE;
      candidatePos.x = Math.max(50, Math.min(totalSize - 50, candidatePos.x));
      candidatePos.y = Math.max(50, Math.min(totalSize - 50, candidatePos.y));

      // Verify path is actually walkable using A* pathfinding (not just destination check)
      const waypoint = this.pathfinder.pathTowardsAvoidingToxic(playerPos, candidatePos);
      if (!waypoint) {
        poolManager.vector2.release(candidatePos);
        continue;
      }

      // If we have exploration tracking, prefer unexplored areas
      if (exploredCells) {
        const cellX = Math.floor(candidatePos.x / CELL_SIZE);
        const cellY = Math.floor(candidatePos.y / CELL_SIZE);
        const cellKey = `${cellX},${cellY}`;

        // Prefer unexplored cells, but accept explored ones if we've tried enough
        if (!exploredCells.has(cellKey) || attempt >= 7) {
          targetPos = candidatePos;
          break;
        } else {
          poolManager.vector2.release(candidatePos);
        }
      } else {
        targetPos = candidatePos;
        break;
      }
    }

    // Fallback: try map center as ultimate safe position
    if (!targetPos) {
      const mapCenter = this.pathfinder.getMapCenter();
      const waypoint = this.pathfinder.pathTowardsAvoidingToxic(playerPos, mapCenter);
      if (waypoint) {
        targetPos = poolManager.vector2.claim(mapCenter.x, mapCenter.y);
      } else {
        // Last resort: stay at current position
        targetPos = poolManager.vector2.claim(playerPos.x, playerPos.y);
      }
    }

    return {
      type: "position",
      position: targetPos,
      priority: AI_CONFIG.PRIORITY_EXPLORE,
    };
  }

  // ============ Helper Methods ============

  /**
   * Find opportunistic pickup target - good weapons, ammo, or resources within pickup radius
   * Used for picking up valuable items while in any state (hunt, explore, etc.)
   * Does NOT target crates - use findOpportunisticCrate for that
   */
  findOpportunisticPickup(player: Player): AITarget | null {
    const playerPos = player.getCenterPosition();
    const inventory = player.getInventory();
    const entityManager = this.gameManagers.getEntityManager();
    const nearbyEntities = entityManager.getNearbyEntities(
      playerPos,
      AI_CONFIG.OPPORTUNISTIC_PICKUP_RADIUS
    );

    let bestTarget: AITarget | null = null;
    let bestScore = -1;

    // What does the player need?
    const needsAmmo = this.needsAmmo(inventory);
    const needsWeapon = !this.hasGoodWeapon(inventory);
    const healthPercent = player.getHealth() / player.getMaxHealth();
    const needsHealth = healthPercent < 0.7;

    for (const entity of nearbyEntities) {
      if (entity.getId() === player.getId()) continue;
      if (!entity.hasExt(Carryable) || !entity.hasExt(Positionable)) continue;
      if (!entity.hasExt(Interactive)) continue;
      if (entity.isMarkedForRemoval()) continue;

      const itemType = entity.getExt(Carryable).getItemType();
      const entityPos = entity.getExt(Positionable).getCenterPosition();

      if (this.pathfinder.isToxicPosition(entityPos)) continue;

      // Skip items we can't pick up (inventory full and not stackable)
      if (!this.canPickUpItem(inventory, itemType)) continue;

      // Calculate priority for this item
      let priority = 0;

      // Good weapons are always high priority
      if ((GOOD_WEAPONS as readonly string[]).includes(itemType)) {
        priority = AI_CONFIG.PRIORITY_GOOD_WEAPON;
      }
      // Ammo when needed
      else if (needsAmmo && itemType.includes("ammo")) {
        priority = AI_CONFIG.PRIORITY_AMMO_NEEDED;
      }
      // Bandages when needed
      else if (needsHealth && itemType === "bandage") {
        priority = AI_CONFIG.PRIORITY_HEALTH_URGENT;
      }
      // Pistol if no good weapon
      else if (needsWeapon && itemType === "pistol") {
        priority = AI_CONFIG.PRIORITY_ANY_WEAPON;
      }
      // Any ammo (pick it up)
      else if (itemType.includes("ammo")) {
        priority = AI_CONFIG.PRIORITY_ANY_AMMO;
      }
      // Bandages (always useful)
      else if (itemType === "bandage") {
        priority = AI_CONFIG.PRIORITY_BANDAGE;
      }

      if (priority <= 0) continue;

      const dist = distance(playerPos, entityPos);
      const score = priority / Math.max(dist, 1);

      if (score > bestScore) {
        bestScore = score;
        // Clone position to avoid reference issues (getCenterPosition returns cached object)
        bestTarget = {
          type: "item",
          entity: entity,
          position: new Vector2(entityPos.x, entityPos.y),
          priority: priority,
          distance: dist,
        };
      }
    }

    return bestTarget;
  }

  /**
   * Find opportunistic crate to destroy - crates within close radius
   * Crates often contain good weapons and should be destroyed when convenient
   */
  findOpportunisticCrate(player: Player): AITarget | null {
    const playerPos = player.getCenterPosition();
    const entityManager = this.gameManagers.getEntityManager();
    const nearbyEntities = entityManager.getNearbyEntities(
      playerPos,
      AI_CONFIG.OPPORTUNISTIC_CRATE_RADIUS
    );

    let closestCrate: AITarget | null = null;
    let closestDistance = Infinity;

    for (const entity of nearbyEntities) {
      if (entity.getType() !== Entities.CRATE) continue;
      if (entity.isMarkedForRemoval()) continue;
      if (!entity.hasExt(Positionable) || !entity.hasExt(Destructible)) continue;

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      if (this.pathfinder.isToxicPosition(entityPos)) continue;

      const dist = distance(playerPos, entityPos);
      if (dist < closestDistance) {
        closestDistance = dist;
        // Clone position to avoid reference issues (getCenterPosition returns cached object)
        closestCrate = {
          type: "crate",
          entity: entity,
          position: new Vector2(entityPos.x, entityPos.y),
          priority: AI_CONFIG.PRIORITY_CRATE,
          distance: dist,
        };
      }
    }

    return closestCrate;
  }

  hasGoodWeapon(inventory: InventoryItem[]): boolean {
    return inventory.some(
      (item) => item && (GOOD_WEAPONS as readonly string[]).includes(item.itemType)
    );
  }

  needsAmmo(inventory: InventoryItem[]): boolean {
    const weapon = inventory.find(
      (item) => item && Object.keys(WEAPON_AMMO_MAP).includes(item.itemType)
    );
    if (!weapon) return false;

    const ammoType = WEAPON_AMMO_MAP[weapon.itemType];
    if (!ammoType) return false;

    const ammo = inventory.find((item) => item && item.itemType === ammoType);
    return !ammo || (ammo.state?.count ?? 0) < 10;
  }

  /**
   * Check if inventory is full (can't add new non-stackable items)
   */
  isInventoryFull(inventory: InventoryItem[]): boolean {
    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    const itemCount = inventory.filter((item) => item != null).length;
    return itemCount >= maxSlots;
  }

  /**
   * Check if the AI can pick up a specific item type
   * Returns true if:
   * - Inventory has space, OR
   * - Item is stackable and AI already has that item type
   */
  canPickUpItem(inventory: InventoryItem[], itemType: string): boolean {
    // If inventory is not full, can always pick up
    if (!this.isInventoryFull(inventory)) {
      return true;
    }

    // Inventory is full - check if item is stackable
    const stackableTypes = [
      "bandage", "wood", "cloth", "coin", "gasoline",
      "pistol_ammo", "shotgun_ammo", "ak47_ammo", "bolt_action_ammo",
      "arrow_ammo", "grenade_launcher_ammo", "flamethrower_ammo",
      "grenade", "throwing_knife", "wall", "spikes", "landmine", "sentry_gun", "torch"
    ];

    if (stackableTypes.includes(itemType)) {
      // Check if we already have this item type to stack with
      return inventory.some((item) => item && item.itemType === itemType);
    }

    // Non-stackable item and inventory is full
    return false;
  }

  /**
   * Get list of weapons the AI currently has
   */
  getOwnedWeapons(inventory: InventoryItem[]): string[] {
    return inventory
      .filter((item) => item && (ALL_WEAPONS as readonly string[]).includes(item.itemType))
      .map((item) => item!.itemType);
  }

  /**
   * Find useless ammo in inventory (ammo for weapons we don't have)
   * Returns the index of the first useless ammo item, or -1 if none found
   */
  findUselessAmmoIndex(inventory: InventoryItem[]): number {
    const ownedWeapons = this.getOwnedWeapons(inventory);

    // Build a set of ammo types we need
    const neededAmmoTypes = new Set<string>();
    for (const weapon of ownedWeapons) {
      const ammoType = WEAPON_AMMO_MAP[weapon];
      if (ammoType) {
        neededAmmoTypes.add(ammoType);
      }
    }

    // Find ammo that we don't need
    for (let i = 0; i < inventory.length; i++) {
      const item = inventory[i];
      if (!item) continue;

      // Check if this is an ammo type
      if (item.itemType.includes("ammo")) {
        // Check if we need this ammo
        if (!neededAmmoTypes.has(item.itemType)) {
          return i;
        }
      }
    }

    return -1;
  }

  /**
   * Check if there's any useful loot that the AI can actually pick up
   * Used to determine if AI should enter LOOT state when inventory is full
   */
  hasUsefulLootTarget(player: Player): boolean {
    const inventory = player.getInventory();

    // If inventory is not full, there's always potential loot
    if (!this.isInventoryFull(inventory)) {
      return true;
    }

    // Inventory is full - check if there's stackable loot we can pick up
    const playerPos = player.getCenterPosition();
    const entityManager = this.gameManagers.getEntityManager();
    const nearbyEntities = entityManager.getNearbyEntities(playerPos, AI_CONFIG.SEARCH_RADIUS);

    for (const entity of nearbyEntities) {
      if (entity.getId() === player.getId()) continue;
      if (!entity.hasExt(Carryable) || !entity.hasExt(Positionable)) continue;
      if (!entity.hasExt(Interactive)) continue;

      const itemType = entity.getExt(Carryable).getItemType();
      const entityPos = entity.getExt(Positionable).getCenterPosition();

      if (this.pathfinder.isToxicPosition(entityPos)) continue;

      // Check if we can pick up this item (stackable and we have it)
      if (this.canPickUpItem(inventory, itemType)) {
        return true;
      }
    }

    // Also check for crates and barrels (they drop items, might get something useful)
    // Don't count these when inventory is completely full though
    return false;
  }

  private getLootPriority(
    itemType: string,
    needsWeapon: boolean,
    needsAmmo: boolean,
    needsHealth: boolean
  ): number {
    // Health when hurt - highest priority for survival
    // Note: This base priority is multiplied by urgency in findBestLootTarget
    if (needsHealth && itemType === "bandage") {
      return AI_CONFIG.PRIORITY_HEALTH_URGENT;
    }

    // Ammo when needed - second highest priority for combat effectiveness
    // Note: This base priority is multiplied by urgency in findBestLootTarget
    if (needsAmmo && itemType.includes("ammo")) {
      return AI_CONFIG.PRIORITY_AMMO_NEEDED;
    }

    // Good weapons when needed
    if (needsWeapon && (GOOD_WEAPONS as readonly string[]).includes(itemType)) {
      return AI_CONFIG.PRIORITY_GOOD_WEAPON;
    }

    // Good weapons even if not needed
    if ((GOOD_WEAPONS as readonly string[]).includes(itemType)) {
      return AI_CONFIG.PRIORITY_ANY_WEAPON;
    }

    // Any ammo (even when not urgently needed)
    if (itemType.includes("ammo")) {
      return AI_CONFIG.PRIORITY_ANY_AMMO;
    }

    // Bandages when not hurt
    if (itemType === "bandage") {
      return AI_CONFIG.PRIORITY_BANDAGE;
    }

    // Knife is always useful
    if (itemType === "knife") {
      return AI_CONFIG.PRIORITY_ANY_WEAPON;
    }

    return -1;
  }
}
