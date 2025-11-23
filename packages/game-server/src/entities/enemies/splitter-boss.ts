import { BossEnemy } from "./boss-enemy";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { MeleeMovementStrategy } from "./strategies/movement";
import { MeleeAttackStrategy } from "./strategies/attack";
import Positionable from "@/extensions/positionable";
import { BossSplitEvent } from "../../../../game-shared/src/events/server-sent/events/boss-split-event";
import Vector2 from "@shared/util/vector2";
import Destructible from "@/extensions/destructible";
import PoolManager from "@/util/pool-manager";
import Collidable from "@/extensions/collidable";

export class SplitterBoss extends BossEnemy {
  private static readonly SPLIT_THRESHOLDS = [0.5]; // 50%
  private static readonly MIN_SPLIT_RADIUS = 32;
  private static readonly MAX_SPLIT_RADIUS = 64;

  private crossedThresholds: Set<number> = new Set();
  private lastHealth: number = 0;

  constructor(
    gameManagers: IGameManagers,
    splitGeneration: number = 0,
    splitsRemaining: number = 3
  ) {
    super(gameManagers, Entities.SPLITTER_BOSS);
    this.setMovementStrategy(new MeleeMovementStrategy());
    this.setAttackStrategy(new MeleeAttackStrategy());

    // Add custom serializable fields to existing serialized object
    this.serialized.set("splitGeneration", splitGeneration);
    this.serialized.set("splitsRemaining", splitsRemaining);

    // Apply stat scaling based on generation
    this.applyStatScaling();

    // Initialize lastHealth to track health changes
    const destructible = this.getExt(Destructible);

    // If this is a spawned splitter (generation > 0), it starts at full health (which is already set in applyStatScaling)
    // but we need to ensure current health matches max health
    if (splitGeneration > 0) {
      destructible.setHealth(destructible.getMaxHealth());
    }

    this.lastHealth = destructible.getHealth();
  }

  private applyStatScaling(): void {
    const splitConfig = this.config.splitConfig;
    if (!splitConfig) {
      return;
    }

    const generation = this.serialized.get("splitGeneration");
    const speedMultiplier = Math.pow(splitConfig.speedMultiplierPerSplit, generation);
    const healthMultiplier = Math.pow(splitConfig.healthMultiplierPerSplit, generation);
    const damageMultiplier = Math.pow(splitConfig.damageMultiplierPerSplit, generation);

    // Apply speed scaling
    this.speed = this.config.stats.speed * speedMultiplier;

    // Apply health scaling
    const destructible = this.getExt(Destructible);
    const baseMaxHealth = this.config.stats.health;
    const scaledMaxHealth = Math.max(1, Math.floor(baseMaxHealth * healthMultiplier));
    const currentHealthPercent = destructible.getHealth() / destructible.getMaxHealth();
    destructible.setMaxHealth(scaledMaxHealth);
    destructible.setHealth(Math.max(1, Math.floor(scaledMaxHealth * currentHealthPercent)));

    // Apply damage scaling
    this.attackDamage = this.config.stats.damage * damageMultiplier;
  }

  protected override updateEnemy(deltaTime: number): void {
    super.updateEnemy(deltaTime);

    const destructible = this.getExt(Destructible);
    if (destructible.isDead()) {
      return;
    }

    this.checkSplitThresholds();
  }

  private checkSplitThresholds(): void {
    const destructible = this.getExt(Destructible);
    const currentHealth = destructible.getHealth();
    const maxHealth = destructible.getMaxHealth();
    const healthPercent = currentHealth / maxHealth;

    const splitsRemaining = this.serialized.get("splitsRemaining");
    if (splitsRemaining <= 0) {
      return; // No splits remaining, just die normally
    }

    // Check each threshold
    for (let i = 0; i < SplitterBoss.SPLIT_THRESHOLDS.length; i++) {
      const threshold = SplitterBoss.SPLIT_THRESHOLDS[i];

      // Check if we've crossed this threshold (health went from above to below threshold)
      if (!this.crossedThresholds.has(threshold)) {
        const wasAboveThreshold = this.lastHealth / maxHealth > threshold;
        const isBelowThreshold = healthPercent <= threshold;

        if (wasAboveThreshold && isBelowThreshold) {
          this.crossedThresholds.add(threshold);
          this.performSplit();
          return; // Only split once per update
        }
      }
    }

    // Update lastHealth for next check
    this.lastHealth = currentHealth;
  }

  private performSplit(): void {
    const splitsRemaining = this.serialized.get("splitsRemaining");
    if (splitsRemaining <= 0) {
      return;
    }

    const destructible = this.getExt(Destructible);
    const currentHealth = destructible.getHealth();
    const splitHealth = Math.max(1, Math.floor(currentHealth / 2));

    const positionable = this.getExt(Positionable);
    const center = positionable.getCenterPosition();
    const mapManager = this.getGameManagers().getMapManager();
    const entityManager = this.getEntityManager();

    const newIds: number[] = [];
    const positions: Array<{ x: number; y: number }> = [];
    const usedPositions: Vector2[] = [];
    const MIN_DISTANCE_BETWEEN_SPLITTERS = 32; // Minimum distance between spawned splitters

    // Create 2 new splitter bosses
    for (let i = 0; i < 2; i++) {
      let spawnPosition: Vector2 | null = null;
      let attempts = 0;
      const maxAttempts = 20;

      // Try to find a valid position that doesn't overlap with already spawned splitters
      while (!spawnPosition && attempts < maxAttempts) {
        const candidatePosition = mapManager.findRandomValidSpawnPosition(
          center,
          SplitterBoss.MIN_SPLIT_RADIUS,
          SplitterBoss.MAX_SPLIT_RADIUS
        );

        if (candidatePosition) {
          // Check if this position is far enough from already used positions
          let isValidPosition = true;
          const poolManager = PoolManager.getInstance();
          const candidateCenter = poolManager.vector2.claim(
            candidatePosition.x + 16,
            candidatePosition.y + 16
          );

          for (const usedPos of usedPositions) {
            const usedCenter = poolManager.vector2.claim(usedPos.x + 16, usedPos.y + 16);
            const distance = candidateCenter.distance(usedCenter);
            poolManager.vector2.release(usedCenter);

            if (distance < MIN_DISTANCE_BETWEEN_SPLITTERS) {
              isValidPosition = false;
              break;
            }
          }

          poolManager.vector2.release(candidateCenter);

          if (isValidPosition) {
            spawnPosition = candidatePosition;
          } else {
            // Release the position if we're not using it
            poolManager.vector2.release(candidatePosition);
          }
        }

        attempts++;
      }

      // If we still don't have a valid position, try a simple offset
      if (!spawnPosition) {
        const angle = (Math.PI * 2 * i) / 2; // 0 and PI radians
        const offset = PoolManager.getInstance().vector2.claim(
          Math.cos(angle) * 40,
          Math.sin(angle) * 40
        );
        spawnPosition = PoolManager.getInstance().vector2.claim(
          center.x + offset.x,
          center.y + offset.y
        );
        PoolManager.getInstance().vector2.release(offset);
      }

      // Track this position to avoid overlaps
      usedPositions.push(spawnPosition);

      const newGeneration = this.serialized.get("splitGeneration") + 1;
      const newSplitsRemaining = splitsRemaining - 1;

      const newBoss = new SplitterBoss(this.getGameManagers(), newGeneration, newSplitsRemaining);

      // Set health to full health after scaling (applyStatScaling already set max health)
      const newDestructible = newBoss.getExt(Destructible);
      newDestructible.setHealth(newDestructible.getMaxHealth());

      // Update lastHealth to match actual health to prevent immediate split
      (newBoss as any).lastHealth = newDestructible.getMaxHealth();

      newBoss.setPosition(spawnPosition);
      entityManager.addEntity(newBoss);

      newIds.push(newBoss.getId());
      positions.push({ x: spawnPosition.x, y: spawnPosition.y });
    }

    // Broadcast split event
    if (newIds.length > 0) {
      this.getGameManagers()
        .getBroadcaster()
        .broadcastEvent(
          new BossSplitEvent({
            originalId: this.getId(),
            newIds,
            positions,
          })
        );
    }

    // Remove the original entity
    entityManager.markEntityForRemoval(this);
  }
}
